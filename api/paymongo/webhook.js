import { resolveGhlConfig, hasLiveGhlId } from "../../src/js/ghl-config.js";
import { resolveInboundWebhookUrl, dispatchInboundWebhook, buildPaymentAutomationPayload } from "../_lib/ghl-webhook-dispatch.js";
import { updateOpportunityState } from "../_lib/ghl-opportunity-sync.js";
import {
  extractPaymongoEventContext,
  isHandledPaymongoEvent,
  readRawRequestBody,
  resolvePaymongoConfig,
  verifyPaymongoWebhookSignature
} from "../_lib/paymongo.js";

export const config = {
  api: {
    bodyParser: false
  }
};

function json(res, status, payload) {
  return res.status(status).json(payload);
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

function buildBookingFromMetadata(metadata = {}, paymentReference = "") {
  return {
    roomId: cleanString(metadata.room_id, 120),
    roomName: cleanString(metadata.room_name, 120),
    checkin: cleanString(metadata.checkin_date || metadata.checkin, 40),
    checkout: cleanString(metadata.checkout_date || metadata.checkout, 40),
    adults: cleanString(metadata.adults, 10),
    children: cleanString(metadata.children, 10),
    fullName: cleanString(metadata.guest_name, 160),
    email: cleanString(metadata.email, 160),
    phone: cleanString(metadata.phone, 40),
    arrivalTime: cleanString(metadata.arrival_time, 80),
    specialRequests: cleanString(metadata.special_requests, 500),
    reference: cleanString(metadata.reservation_reference, 120),
    total: cleanString(metadata.total_amount, 40),
    deposit: cleanString(metadata.deposit_amount_due, 40),
    balance: cleanString(metadata.balance_due, 40),
    pricingSource: cleanString(metadata.pricing_source, 40),
    ghlContactId: cleanString(metadata.ghl_contact_id, 120),
    ghlOpportunityId: cleanString(metadata.ghl_opportunity_id, 120),
    paymentReference: cleanString(paymentReference, 160)
  };
}

function resolveEventState(config, eventType) {
  if (eventType === "checkout_session.payment.paid" || eventType === "payment.paid") {
    return {
      automationEventType: "payment_paid",
      pipelineStageId: hasLiveGhlId(config.pipeline.stages.paymentReceivedStageId)
        ? config.pipeline.stages.paymentReceivedStageId
        : hasLiveGhlId(config.pipeline.stages.confirmedStageId)
          ? config.pipeline.stages.confirmedStageId
        : config.pipeline.stages.waitingForPaymentStageId,
      reservationStatus: "confirmed_reservation",
      paymentStatus: "paid",
      calendarStatus: "reserved"
    };
  }

  if (eventType === "payment.failed") {
    return {
      automationEventType: "payment_failed",
      pipelineStageId: config.pipeline.stages.waitingForPaymentStageId,
      reservationStatus: "awaiting_payment",
      paymentStatus: "failed",
      calendarStatus: "not_blocked"
    };
  }

  if (eventType === "checkout_session.expired") {
    return {
      automationEventType: "payment_expired",
      pipelineStageId: hasLiveGhlId(config.pipeline.stages.expiredStageId)
        ? config.pipeline.stages.expiredStageId
        : config.pipeline.stages.waitingForPaymentStageId,
      reservationStatus: "expired_not_paid",
      paymentStatus: "expired",
      calendarStatus: "released"
    };
  }

  return null;
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    const paymongoConfig = resolvePaymongoConfig(process.env);
    const ghlConfig = resolveGhlConfig(process.env);

    return json(res, 200, {
      ok: true,
      route: "paymongo-webhook",
      mode: "inspect_only",
      requiredEnv: {
        PAYMONGO_WEBHOOK_SECRET: Boolean(paymongoConfig.webhookSecret),
        GHL_ACCESS_TOKEN: Boolean(process.env.GHL_ACCESS_TOKEN),
        GHL_LOCATION_ID: Boolean(process.env.GHL_LOCATION_ID),
        GHL_RESERVATIONS_PIPELINE_ID: hasLiveGhlId(ghlConfig.pipeline.reservationsPipelineId),
        GHL_STAGE_PAYMENT_RECEIVED_ID: hasLiveGhlId(ghlConfig.pipeline.stages.paymentReceivedStageId)
      }
    });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return json(res, 405, { ok: false, error: "Method not allowed" });
  }

  try {
    const paymongoConfig = resolvePaymongoConfig(process.env);

    if (!paymongoConfig.webhookSecret) {
      return json(res, 500, { ok: false, error: "Missing PAYMONGO_WEBHOOK_SECRET" });
    }

    const rawBody = await readRawRequestBody(req);
    const signatureHeader = req.headers["paymongo-signature"] || req.headers["Paymongo-Signature"];

    if (!verifyPaymongoWebhookSignature(paymongoConfig.webhookSecret, signatureHeader, rawBody)) {
      return json(res, 401, { ok: false, error: "Invalid PayMongo webhook signature" });
    }

    let payload = null;

    try {
      payload = rawBody ? JSON.parse(rawBody) : null;
    } catch {
      payload = null;
    }

    if (!payload) {
      return json(res, 400, { ok: false, error: "Invalid PayMongo webhook payload" });
    }

    const eventContext = extractPaymongoEventContext(payload);

    if (!isHandledPaymongoEvent(eventContext.eventType)) {
      return json(res, 200, {
        ok: true,
        ignored: true,
        reason: "unsupported_event",
        eventType: eventContext.eventType
      });
    }

    const ghlConfig = resolveGhlConfig(process.env);
    const eventState = resolveEventState(ghlConfig, eventContext.eventType);
    const booking = buildBookingFromMetadata(eventContext.metadata, eventContext.paymentReference);
    const token = process.env.GHL_ACCESS_TOKEN;
    const locationId = process.env.GHL_LOCATION_ID;

    if (!eventState) {
      return json(res, 200, {
        ok: true,
        ignored: true,
        reason: "unmapped_event",
        eventType: eventContext.eventType
      });
    }

    let directUpdate = {
      enabled: false,
      updated: false
    };

    if (token && locationId && hasLiveGhlId(booking.ghlOpportunityId)) {
      const updateResult = await updateOpportunityState({
        token,
        locationId,
        opportunityId: booking.ghlOpportunityId,
        config: ghlConfig,
        booking,
        pipelineStageId: eventState.pipelineStageId,
        reservationStatus: eventState.reservationStatus,
        paymentStatus: eventState.paymentStatus,
        calendarStatus: eventState.calendarStatus,
        paymentReference: eventContext.paymentReference,
        holdExpiresAt: ""
      });

      if (!updateResult.ok) {
        return json(res, 502, {
          ok: false,
          step: "ghl_opportunity_update",
          status: updateResult.status,
          statusText: updateResult.statusText,
          body: updateResult.body,
          eventType: eventContext.eventType
        });
      }

      directUpdate = {
        enabled: true,
        updated: true,
        status: updateResult.status
      };
    }

    const inboundWebhookUrl = resolveInboundWebhookUrl(process.env);
    const automationPayload = buildPaymentAutomationPayload({
      eventType: eventState.automationEventType,
      locationId: locationId || cleanString(eventContext.metadata.location_id, 120),
      contactId: booking.ghlContactId,
      opportunityId: booking.ghlOpportunityId,
      booking,
      reservationStatus: eventState.reservationStatus,
      paymentStatus: eventState.paymentStatus,
      calendarStatus: eventState.calendarStatus,
      paymentReference: eventContext.paymentReference,
      checkoutSessionId: eventContext.resourceType === "checkout_session" ? eventContext.resourceId : "",
      paymongoEventType: eventContext.eventType,
      paidAt: eventContext.paidAt
    });
    const automationResult = await dispatchInboundWebhook(inboundWebhookUrl, automationPayload);

    return json(res, 200, {
      ok: true,
      eventType: eventContext.eventType,
      opportunityId: booking.ghlOpportunityId || null,
      reservationReference: booking.reference || null,
      directUpdate,
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
