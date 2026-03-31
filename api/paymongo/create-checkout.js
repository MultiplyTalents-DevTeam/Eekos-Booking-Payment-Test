import { PAYMENT_CONFIG } from "../../src/js/config.js";
import { ROOM_DATA } from "../../src/js/data/rooms.js";
import { getBookingPreviewFinancials } from "../../src/js/lib/booking.js";
import {
  appendQueryParams,
  buildPaymongoCheckoutPayload,
  fetchPaymongoJson,
  isPaymongoConfigReady,
  resolvePaymongoCheckoutRoute,
  resolvePaymongoConfig
} from "../_lib/paymongo.js";
import {
  buildPaymentAutomationPayload,
  dispatchInboundWebhook,
  resolveInboundWebhookUrl
} from "../_lib/ghl-webhook-dispatch.js";

function json(res, status, payload) {
  return res.status(status).json(payload);
}

function parseBody(req) {
  if (!req.body) {
    return null;
  }

  if (typeof req.body === "object") {
    return req.body;
  }

  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return null;
    }
  }

  return null;
}

function cleanString(value, maxLength = 500) {
  if (value == null) {
    return "";
  }

  return String(value)
    .replace(/[\u0000-\u001F\u007F]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function findRoom(body) {
  const requestedRoomId = cleanString(body.roomId, 120);
  const requestedRoomName = cleanString(body.roomName || body.room, 120).toLowerCase();

  return ROOM_DATA.find((room) => room.id === requestedRoomId)
    || ROOM_DATA.find((room) => room.name.toLowerCase() === requestedRoomName)
    || null;
}

function validateCheckoutBody(body) {
  const required = {
    roomId: cleanString(body.roomId, 120),
    checkin: cleanString(body.checkin, 40),
    checkout: cleanString(body.checkout, 40),
    fullName: cleanString(body.fullName, 160),
    email: cleanString(body.email, 160),
    phone: cleanString(body.phone, 40),
    reference: cleanString(body.reference, 120)
  };

  for (const [field, value] of Object.entries(required)) {
    if (!value) {
      return { valid: false, field, message: `Missing ${field}` };
    }
  }

  return { valid: true };
}

function buildCheckoutBooking(body, room, financials) {
  return {
    roomId: room.id,
    roomName: room.name,
    checkin: cleanString(body.checkin, 40),
    checkout: cleanString(body.checkout, 40),
    adults: cleanString(body.adults, 10),
    children: cleanString(body.children, 10),
    fullName: cleanString(body.fullName, 160),
    email: cleanString(body.email, 160),
    phone: cleanString(body.phone, 40),
    arrivalTime: cleanString(body.arrivalTime, 80),
    specialRequests: cleanString(body.specialRequests, 500),
    reference: cleanString(body.reference, 120),
    total: financials.total,
    deposit: financials.deposit > 0 ? financials.deposit : financials.total,
    balance: financials.balance,
    pricingSource: cleanString(body.pricingSource, 40) || financials.rateSource,
    ghlContactId: cleanString(body.ghlContactId, 120),
    ghlOpportunityId: cleanString(body.ghlOpportunityId, 120)
  };
}

function extractPaymongoErrorText(body) {
  if (!body) {
    return "";
  }

  if (typeof body === "string") {
    return cleanString(body, 300);
  }

  const firstError = Array.isArray(body?.errors) ? body.errors[0] : null;
  return cleanString(
    firstError?.detail
      || firstError?.title
      || firstError?.code
      || body?.message
      || body?.error
      || "",
    300
  );
}

function isDuplicateReferenceError(checkoutResult) {
  if (checkoutResult?.status !== 400) {
    return false;
  }

  const detail = extractPaymongoErrorText(checkoutResult.body).toLowerCase();
  return detail.includes("reference")
    && (detail.includes("already") || detail.includes("duplicate") || detail.includes("exist"));
}

function buildRetryReference(reference) {
  const base = cleanString(reference, 100) || `EEKOS-${Date.now().toString().slice(-8)}`;
  const suffix = Date.now().toString().slice(-6);
  return cleanString(`${base}-${suffix}`, 120);
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    const config = resolvePaymongoConfig(process.env, PAYMENT_CONFIG);

    return json(res, 200, {
      ok: true,
      route: "paymongo-create-checkout",
      mode: "inspect_only",
      ready: isPaymongoConfigReady(config),
      requiredEnv: {
        PAYMONGO_SECRET_KEY: Boolean(config.secretKey),
        PAYMONGO_WEBHOOK_SECRET: Boolean(config.webhookSecret),
        APP_BASE_URL: Boolean(config.appBaseUrl),
        PAYMONGO_SUCCESS_URL: Boolean(config.successUrl),
        PAYMONGO_CANCEL_URL: Boolean(config.cancelUrl)
      },
      paymentMethodTypes: config.paymentMethodTypes,
      currency: config.currency
    });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return json(res, 405, { ok: false, error: "Method not allowed" });
  }

  try {
    const paymongoConfig = resolvePaymongoConfig(process.env, PAYMENT_CONFIG);

    if (!isPaymongoConfigReady(paymongoConfig)) {
      return json(res, 500, {
        ok: false,
        error: "PayMongo checkout is not fully configured on the server."
      });
    }

    const body = parseBody(req);

    if (!body) {
      return json(res, 400, { ok: false, error: "Invalid JSON body" });
    }

    const validation = validateCheckoutBody(body);

    if (!validation.valid) {
      return json(res, 400, {
        ok: false,
        error: validation.message,
        field: validation.field
      });
    }

    const room = findRoom(body);

    if (!room) {
      return json(res, 404, {
        ok: false,
        error: "Selected room could not be found."
      });
    }

    const financials = getBookingPreviewFinancials({
      room,
      checkin: cleanString(body.checkin, 40),
      checkout: cleanString(body.checkout, 40),
      paymentConfig: PAYMENT_CONFIG
    });

    if (financials.nights < 1) {
      return json(res, 400, {
        ok: false,
        error: "Check-out must be after check-in."
      });
    }

    if (financials.total <= 0) {
      return json(res, 400, {
        ok: false,
        error: "Unable to calculate a payable amount for this booking. Configure room pricing before using live checkout."
      });
    }

    const booking = buildCheckoutBooking(body, room, financials);
    const successUrl = appendQueryParams(paymongoConfig.successUrl, {
      reference: booking.reference,
      room: room.id,
      opportunity: booking.ghlOpportunityId
    });
    const cancelUrl = appendQueryParams(paymongoConfig.cancelUrl, {
      reference: booking.reference,
      room: room.id,
      opportunity: booking.ghlOpportunityId
    });

    let paymongoPayload = buildPaymongoCheckoutPayload({
      booking,
      room,
      financials,
      paymongoConfig,
      successUrl,
      cancelUrl
    });

    let checkoutResult = await fetchPaymongoJson(
      resolvePaymongoCheckoutRoute(),
      paymongoConfig.secretKey,
      {
        method: "POST",
        body: JSON.stringify(paymongoPayload)
      }
    );

    if (!checkoutResult.ok && isDuplicateReferenceError(checkoutResult)) {
      booking.reference = buildRetryReference(booking.reference);

      const retrySuccessUrl = appendQueryParams(paymongoConfig.successUrl, {
        reference: booking.reference,
        room: room.id,
        opportunity: booking.ghlOpportunityId
      });
      const retryCancelUrl = appendQueryParams(paymongoConfig.cancelUrl, {
        reference: booking.reference,
        room: room.id,
        opportunity: booking.ghlOpportunityId
      });

      paymongoPayload = buildPaymongoCheckoutPayload({
        booking,
        room,
        financials,
        paymongoConfig,
        successUrl: retrySuccessUrl,
        cancelUrl: retryCancelUrl
      });

      checkoutResult = await fetchPaymongoJson(
        resolvePaymongoCheckoutRoute(),
        paymongoConfig.secretKey,
        {
          method: "POST",
          body: JSON.stringify(paymongoPayload)
        }
      );
    }

    if (!checkoutResult.ok) {
      const detail = extractPaymongoErrorText(checkoutResult.body);
      return json(res, 502, {
        ok: false,
        error: detail ? `PayMongo checkout error: ${detail}` : "Unable to create PayMongo checkout session.",
        status: checkoutResult.status,
        statusText: checkoutResult.statusText,
        body: checkoutResult.body
      });
    }

    const checkoutSession = checkoutResult.body?.data || {};
    const checkoutAttributes = checkoutSession?.attributes || {};
    const checkoutUrl = checkoutAttributes.checkout_url || "";
    const checkoutSessionId = checkoutSession?.id || "";
    const inboundWebhookUrl = resolveInboundWebhookUrl(process.env);

    const automationPayload = buildPaymentAutomationPayload({
      eventType: "payment_checkout_created",
      locationId: process.env.GHL_LOCATION_ID || "",
      contactId: booking.ghlContactId,
      opportunityId: booking.ghlOpportunityId,
      booking,
      reservationStatus: "awaiting_payment",
      paymentStatus: "pending",
      calendarStatus: "not_blocked",
      checkoutSessionId,
      paymongoEventType: "checkout_session.created"
    });
    const automationResult = await dispatchInboundWebhook(inboundWebhookUrl, automationPayload);

    return json(res, 200, {
      ok: true,
      checkoutUrl,
      checkoutSessionId,
      reference: booking.reference,
      dueNow: booking.deposit,
      estimatedTotal: booking.total,
      balanceDue: booking.balance,
      automation: automationResult.skipped
        ? {
            enabled: false,
            dispatched: false,
            reason: automationResult.reason
          }
        : automationResult.ok
          ? {
              enabled: true,
              dispatched: true,
              status: automationResult.status
            }
          : {
              enabled: true,
              dispatched: false,
              status: automationResult.status,
              statusText: automationResult.statusText
            }
    });
  } catch (error) {
    return json(res, 500, {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}
