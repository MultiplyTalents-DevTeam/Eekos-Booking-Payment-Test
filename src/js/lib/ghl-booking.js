import { hasLiveGhlId } from "../ghl-config.js";

const DEFAULT_HOLD_MINUTES = 20;
const DEFAULT_RESERVATION_STATUS = "awaiting_payment";
const DEFAULT_PAYMENT_STATUS = "pending";
const DEFAULT_CALENDAR_STATUS = "not_blocked";

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

function toNumber(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value !== "string") {
    return 0;
  }

  const parsed = Number(value.replace(/[^\d.-]+/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function toInteger(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toRoomOptionKey(value) {
  return cleanString(value, 120)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function splitFullName(fullName) {
  const normalized = cleanString(fullName, 160);

  if (!normalized) {
    return { firstName: "", lastName: "" };
  }

  const parts = normalized.split(" ").filter(Boolean);

  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" };
  }

  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts.at(-1) || ""
  };
}

export function buildOpportunityName(booking) {
  const roomName = cleanString(booking.roomName || booking.room, 120) || "EEKOS Reservation";
  const guestName = cleanString(booking.fullName, 120) || "Guest";
  const reference = cleanString(booking.reference, 60);

  return reference
    ? `${roomName} - ${guestName} - ${reference}`
    : `${roomName} - ${guestName}`;
}

export function buildHoldExpiresAt(booking, holdMinutes = DEFAULT_HOLD_MINUTES) {
  const baseDate = booking.createdAt ? new Date(booking.createdAt) : new Date();

  if (Number.isNaN(baseDate.getTime())) {
    return "";
  }

  baseDate.setMinutes(baseDate.getMinutes() + holdMinutes);
  return baseDate.toISOString();
}

export function resolveRoomFieldValue(booking) {
  return toRoomOptionKey(booking.roomOptionKey || booking.roomId || booking.roomName || booking.room);
}

function pushField(fields, fieldId, value) {
  if (!hasLiveGhlId(fieldId)) {
    return;
  }

  if (value == null || value === "") {
    return;
  }

  fields.push({ id: fieldId, value });
}

export function buildOpportunityCustomFields(config, booking, options = {}) {
  const reservationStatus = cleanString(options.reservationStatus || DEFAULT_RESERVATION_STATUS, 80);
  const paymentStatus = cleanString(options.paymentStatus || DEFAULT_PAYMENT_STATUS, 80);
  const calendarStatus = cleanString(options.calendarStatus || DEFAULT_CALENDAR_STATUS, 80);
  const holdExpiresAt = options.holdExpiresAt || buildHoldExpiresAt(booking);
  const fields = [];

  pushField(fields, config.customFields.roomNameFieldId, resolveRoomFieldValue(booking));
  pushField(fields, config.customFields.checkInDateFieldId, cleanString(booking.checkin, 40));
  pushField(fields, config.customFields.checkOutDateFieldId, cleanString(booking.checkout, 40));
  pushField(fields, config.customFields.reservationStatusFieldId, reservationStatus);
  pushField(fields, config.customFields.paymentStatusFieldId, paymentStatus);
  pushField(fields, config.customFields.finalTotalAmountFieldId, toNumber(booking.total));
  pushField(fields, config.customFields.holdExpiresAtFieldId, holdExpiresAt);
  pushField(fields, config.customFields.specialRequestsFieldId, cleanString(booking.specialRequests, 500));
  pushField(fields, config.customFields.adultCountFieldId, toInteger(booking.adults));
  pushField(fields, config.customFields.childCountFieldId, toInteger(booking.children));
  pushField(fields, config.customFields.paymentReferenceFieldId, cleanString(booking.paymentReference, 120));
  pushField(fields, config.customFields.reservationReferenceFieldId, cleanString(booking.reference, 120));
  pushField(fields, config.customFields.calendarStatusFieldId, calendarStatus);
  pushField(fields, config.customFields.depositAmountDueFieldId, toNumber(booking.deposit));

  return fields;
}

export function buildContactUpsertPayload(locationId, booking) {
  const { firstName, lastName } = splitFullName(booking.fullName);

  return {
    locationId,
    firstName,
    lastName,
    name: cleanString(booking.fullName, 160),
    email: cleanString(booking.email, 160),
    phone: cleanString(booking.phone, 40),
    source: "EEKOS Website"
  };
}

export function buildOpportunityPayload(config, booking, contactId, options = {}) {
  const customFields = buildOpportunityCustomFields(config, booking, options);
  const payload = {
    locationId: config.locationId,
    contactId,
    name: buildOpportunityName(booking),
    pipelineId: config.pipeline.reservationsPipelineId,
    pipelineStageId: config.pipeline.stages.waitingForPaymentStageId,
    status: "open",
    source: "EEKOS Website"
  };

  const monetaryValue = toNumber(booking.total);

  if (monetaryValue > 0) {
    payload.monetaryValue = monetaryValue;
  }

  if (customFields.length > 0) {
    payload.customFields = customFields;
  }

  return payload;
}
