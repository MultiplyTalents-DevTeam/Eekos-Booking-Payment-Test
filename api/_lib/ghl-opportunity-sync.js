import { fetchGhlJson } from "./ghl-route-utils.js";
import { buildOpportunityCustomFields } from "../../src/js/lib/ghl-booking.js";

function toNumber(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value !== "string") {
    return 0;
  }

  const normalized = value.replace(/[^\d.-]+/g, "");
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : 0;
}

export function buildOpportunityUpdatePayload(config, locationId, booking, options = {}) {
  const payload = {
    locationId,
    pipelineId: config.pipeline.reservationsPipelineId,
    status: "open"
  };

  if (options.pipelineStageId) {
    payload.pipelineStageId = options.pipelineStageId;
  }

  const monetaryValue = toNumber(booking.total);

  if (monetaryValue > 0) {
    payload.monetaryValue = monetaryValue;
  }

  const customFields = buildOpportunityCustomFields(config, booking, {
    reservationStatus: options.reservationStatus,
    paymentStatus: options.paymentStatus,
    calendarStatus: options.calendarStatus,
    holdExpiresAt: options.holdExpiresAt,
    paymentReference: options.paymentReference
  });

  if (customFields.length > 0) {
    payload.customFields = customFields;
  }

  return payload;
}

export async function updateOpportunityState({
  token,
  locationId,
  opportunityId,
  config,
  booking,
  pipelineStageId,
  reservationStatus,
  paymentStatus,
  calendarStatus,
  paymentReference,
  holdExpiresAt = ""
}) {
  const payload = buildOpportunityUpdatePayload(config, locationId, booking, {
    pipelineStageId,
    reservationStatus,
    paymentStatus,
    calendarStatus,
    paymentReference,
    holdExpiresAt
  });

  return fetchGhlJson(`/opportunities/${encodeURIComponent(opportunityId)}`, token, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
}
