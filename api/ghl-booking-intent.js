import { hasLiveGhlId, resolveGhlConfig } from "../src/js/ghl-config.js";
import {
  buildContactUpsertPayload,
  buildOpportunityPayload
} from "../src/js/lib/ghl-booking.js";

const GHL_BASE_URL = "https://services.leadconnectorhq.com";
const GHL_API_VERSION = "2021-07-28";

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
    } catch (error) {
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

function getEntityId(payload, keys = []) {
  const candidates = [
    payload?.id,
    payload?._id,
    payload?.data?.id,
    payload?.data?._id,
    ...keys.flatMap((key) => [
      payload?.[key]?.id,
      payload?.[key]?._id,
      payload?.data?.[key]?.id,
      payload?.data?.[key]?._id
    ])
  ];

  return candidates.find((value) => typeof value === "string" && value.trim()) || "";
}

function validateBookingIntent(body) {
  const required = {
    roomName: cleanString(body.roomName || body.room, 120),
    checkin: cleanString(body.checkin, 40),
    checkout: cleanString(body.checkout, 40),
    fullName: cleanString(body.fullName, 160),
    email: cleanString(body.email, 160),
    phone: cleanString(body.phone, 40),
    reference: cleanString(body.reference, 80)
  };

  for (const [field, value] of Object.entries(required)) {
    if (!value) {
      return { valid: false, field, message: `Missing ${field}` };
    }
  }

  return { valid: true };
}

async function fetchGhl(path, token, method, payload) {
  const response = await fetch(`${GHL_BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Version: GHL_API_VERSION,
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: payload ? JSON.stringify(payload) : undefined
  });

  const text = await response.text();
  let jsonBody = null;

  try {
    jsonBody = text ? JSON.parse(text) : null;
  } catch (error) {
    jsonBody = text || null;
  }

  return {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    body: jsonBody
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return json(res, 405, { ok: false, error: "Method not allowed" });
  }

  try {
    const token = process.env.GHL_ACCESS_TOKEN;
    const locationId = process.env.GHL_LOCATION_ID;

    if (!token) {
      return json(res, 500, { ok: false, error: "Missing GHL_ACCESS_TOKEN" });
    }

    if (!locationId) {
      return json(res, 500, { ok: false, error: "Missing GHL_LOCATION_ID" });
    }

    const config = resolveGhlConfig(process.env);
    config.locationId = locationId;

    if (!hasLiveGhlId(config.pipeline.reservationsPipelineId)) {
      return json(res, 500, {
        ok: false,
        error: "Missing GHL reservations pipeline ID"
      });
    }

    if (!hasLiveGhlId(config.pipeline.stages.waitingForPaymentStageId)) {
      return json(res, 500, {
        ok: false,
        error: "Missing GHL waiting-for-payment stage ID"
      });
    }

    const body = parseBody(req);

    if (!body) {
      return json(res, 400, { ok: false, error: "Invalid JSON body" });
    }

    const validation = validateBookingIntent(body);

    if (!validation.valid) {
      return json(res, 400, {
        ok: false,
        error: validation.message,
        field: validation.field
      });
    }

    const booking = {
      roomId: cleanString(body.roomId, 120),
      roomName: cleanString(body.roomName || body.room, 120),
      checkin: cleanString(body.checkin, 40),
      checkout: cleanString(body.checkout, 40),
      adults: cleanString(body.adults, 10),
      children: cleanString(body.children, 10),
      fullName: cleanString(body.fullName, 160),
      email: cleanString(body.email, 160),
      phone: cleanString(body.phone, 40),
      arrivalTime: cleanString(body.arrivalTime, 80),
      specialRequests: cleanString(body.specialRequests, 500),
      reference: cleanString(body.reference, 80),
      total: body.total,
      deposit: body.deposit,
      balance: body.balance,
      createdAt: cleanString(body.createdAt, 80),
      paymentReference: cleanString(body.paymentReference, 120)
    };

    const contactPayload = buildContactUpsertPayload(locationId, booking);
    const contactResult = await fetchGhl("/contacts/upsert", token, "POST", contactPayload);

    if (!contactResult.ok) {
      return json(res, 502, {
        ok: false,
        step: "contact_upsert",
        status: contactResult.status,
        statusText: contactResult.statusText,
        body: contactResult.body
      });
    }

    const contactId = getEntityId(contactResult.body, ["contact"]);

    if (!contactId) {
      return json(res, 502, {
        ok: false,
        step: "contact_upsert",
        error: "Unable to resolve contact ID from GHL response",
        body: contactResult.body
      });
    }

    const opportunityPayload = buildOpportunityPayload(config, booking, contactId, {
      reservationStatus: "waiting_for_payment",
      paymentStatus: "unpaid"
    });

    const opportunityResult = await fetchGhl("/opportunities/", token, "POST", opportunityPayload);

    if (!opportunityResult.ok) {
      return json(res, 502, {
        ok: false,
        step: "opportunity_create",
        status: opportunityResult.status,
        statusText: opportunityResult.statusText,
        body: opportunityResult.body,
        payloadPreview: {
          pipelineId: opportunityPayload.pipelineId,
          pipelineStageId: opportunityPayload.pipelineStageId,
          customFieldCount: opportunityPayload.customFields?.length || 0
        }
      });
    }

    const opportunityId = getEntityId(opportunityResult.body, ["opportunity"]);

    return json(res, 200, {
      ok: true,
      contactId,
      opportunityId,
      reservationStatus: "waiting_for_payment",
      paymentStatus: "unpaid"
    });
  } catch (error) {
    return json(res, 500, {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}
