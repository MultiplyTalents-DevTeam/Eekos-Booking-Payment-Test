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

function firstHeaderValue(value) {
  return cleanString(Array.isArray(value) ? value[0] : String(value || "").split(",")[0], 240);
}

function resolveRequestBaseUrl(req) {
  const forwardedProto = firstHeaderValue(req?.headers?.["x-forwarded-proto"]);
  const forwardedHost = firstHeaderValue(req?.headers?.["x-forwarded-host"]);
  const host = forwardedHost || firstHeaderValue(req?.headers?.host);
  const protocol = forwardedProto || (host.includes("localhost") ? "http" : "https");

  if (!host) {
    return "";
  }

  return `${protocol}://${host}`;
}

function normalizeRoomToken(value) {
  return cleanString(value, 160)
    .toLowerCase()
    .replace(/[^\w\s-]+/g, "")
    .replace(/[_\s]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function findRoom(body) {
  const requestedRoomId = cleanString(body.roomId, 120);
  const requestedRoomName = cleanString(body.roomName || body.room, 120);
  const requestedRoomToken = normalizeRoomToken(requestedRoomId);
  const requestedNameToken = normalizeRoomToken(requestedRoomName);
  const candidates = new Set(
    [requestedRoomToken, requestedNameToken]
      .filter(Boolean)
      .flatMap((token) => [token, token.replace(/-/g, "_"), token.replace(/_/g, "-")])
  );

  return ROOM_DATA.find((room) => room.id === requestedRoomId)
    || ROOM_DATA.find((room) => room.name.toLowerCase() === requestedRoomName.toLowerCase())
    || ROOM_DATA.find((room) => {
      const roomIdToken = normalizeRoomToken(room.id);
      const roomNameToken = normalizeRoomToken(room.name);
      return candidates.has(roomIdToken) || candidates.has(roomNameToken);
    })
    || null;
}

function validateCheckoutBody(body) {
  const roomId = cleanString(body.roomId, 120);
  const roomName = cleanString(body.roomName || body.room, 120);

  if (!roomId && !roomName) {
    return { valid: false, field: "roomId", message: "Missing roomId" };
  }

  const required = {
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

function isRedirectUrlError(checkoutResult) {
  const detail = extractPaymongoErrorText(checkoutResult.body).toLowerCase();
  return detail.includes("success_url")
    || detail.includes("cancel_url")
    || detail.includes("received non-200 response")
    || detail.includes("non-200 response")
    || detail.includes("redirect");
}

function buildCheckoutRedirectUrls(successUrl, cancelUrl, booking, room) {
  const callbackToken = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return {
    successUrl: appendQueryParams(successUrl, {
      reference: booking.reference,
      room: room.id,
      opportunity: booking.ghlOpportunityId,
      cb: callbackToken
    }),
    cancelUrl: appendQueryParams(cancelUrl, {
      reference: booking.reference,
      room: room.id,
      opportunity: booking.ghlOpportunityId,
      cb: callbackToken
    })
  };
}

function buildHostedReturnUrls(baseUrl) {
  const normalizedBase = cleanString(baseUrl, 240).replace(/\/+$/, "");

  if (!normalizedBase) {
    return {
      successUrl: "",
      cancelUrl: ""
    };
  }

  return {
    successUrl: `${normalizedBase}/api/paymongo/return-success`,
    cancelUrl: `${normalizedBase}/api/paymongo/return-cancelled`
  };
}

function resolveVercelProductionBaseUrl(env = process.env) {
  const projectProductionHost = cleanString(env.VERCEL_PROJECT_PRODUCTION_URL, 240);
  if (projectProductionHost) {
    return `https://${projectProductionHost.replace(/^https?:\/\//i, "")}`;
  }

  return "";
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
        error: "Selected room could not be found.",
        details: {
          roomId: cleanString(body.roomId, 120),
          roomName: cleanString(body.roomName || body.room, 120)
        }
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
    const configuredRedirects = buildCheckoutRedirectUrls(
      paymongoConfig.successUrl,
      paymongoConfig.cancelUrl,
      booking,
      room
    );
    let successUrl = configuredRedirects.successUrl;
    let cancelUrl = configuredRedirects.cancelUrl;
    const attemptedRedirects = [
      {
        source: "configured_env",
        successUrl,
        cancelUrl
      }
    ];

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

    if (!checkoutResult.ok && isRedirectUrlError(checkoutResult)) {
      const productionBaseUrl = resolveVercelProductionBaseUrl(process.env);
      const productionHostedReturns = buildHostedReturnUrls(productionBaseUrl);

      if (productionHostedReturns.successUrl && productionHostedReturns.cancelUrl) {
        const productionRedirects = buildCheckoutRedirectUrls(
          productionHostedReturns.successUrl,
          productionHostedReturns.cancelUrl,
          booking,
          room
        );

        if (
          productionRedirects.successUrl !== successUrl
          || productionRedirects.cancelUrl !== cancelUrl
        ) {
          successUrl = productionRedirects.successUrl;
          cancelUrl = productionRedirects.cancelUrl;
          attemptedRedirects.push({
            source: "vercel_production_hosted_return_fallback",
            successUrl,
            cancelUrl
          });

          paymongoPayload = buildPaymongoCheckoutPayload({
            booking,
            room,
            financials,
            paymongoConfig,
            successUrl,
            cancelUrl
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
      }
    }

    if (!checkoutResult.ok && isRedirectUrlError(checkoutResult)) {
      const requestBaseUrl = resolveRequestBaseUrl(req);
      const fallbackSuccess = requestBaseUrl ? `${requestBaseUrl}/payment-success` : "";
      const fallbackCancel = requestBaseUrl ? `${requestBaseUrl}/payment-cancelled` : "";

      if (fallbackSuccess && fallbackCancel) {
        const fallbackRedirects = buildCheckoutRedirectUrls(
          fallbackSuccess,
          fallbackCancel,
          booking,
          room
        );

        if (
          fallbackRedirects.successUrl !== successUrl
          || fallbackRedirects.cancelUrl !== cancelUrl
        ) {
          successUrl = fallbackRedirects.successUrl;
          cancelUrl = fallbackRedirects.cancelUrl;
          attemptedRedirects.push({
            source: "request_origin_fallback",
            successUrl,
            cancelUrl
          });

          paymongoPayload = buildPaymongoCheckoutPayload({
            booking,
            room,
            financials,
            paymongoConfig,
            successUrl,
            cancelUrl
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
      }
    }

    if (!checkoutResult.ok && isRedirectUrlError(checkoutResult)) {
      const requestBaseUrl = resolveRequestBaseUrl(req);
      const hostedReturns = buildHostedReturnUrls(requestBaseUrl);

      if (hostedReturns.successUrl && hostedReturns.cancelUrl) {
        const hostedRedirects = buildCheckoutRedirectUrls(
          hostedReturns.successUrl,
          hostedReturns.cancelUrl,
          booking,
          room
        );

        if (
          hostedRedirects.successUrl !== successUrl
          || hostedRedirects.cancelUrl !== cancelUrl
        ) {
          successUrl = hostedRedirects.successUrl;
          cancelUrl = hostedRedirects.cancelUrl;
          attemptedRedirects.push({
            source: "api_hosted_return_fallback",
            successUrl,
            cancelUrl
          });

          paymongoPayload = buildPaymongoCheckoutPayload({
            booking,
            room,
            financials,
            paymongoConfig,
            successUrl,
            cancelUrl
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
      }
    }

    if (!checkoutResult.ok && isDuplicateReferenceError(checkoutResult)) {
      booking.reference = buildRetryReference(booking.reference);

      const retryRedirects = buildCheckoutRedirectUrls(
        successUrl.split("?")[0],
        cancelUrl.split("?")[0],
        booking,
        room
      );

      paymongoPayload = buildPaymongoCheckoutPayload({
        booking,
        room,
        financials,
        paymongoConfig,
        successUrl: retryRedirects.successUrl,
        cancelUrl: retryRedirects.cancelUrl
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
        body: checkoutResult.body,
        attemptedRedirects
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
