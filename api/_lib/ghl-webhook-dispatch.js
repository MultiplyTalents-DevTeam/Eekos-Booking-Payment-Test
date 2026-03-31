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

export function resolveInboundWebhookUrl(env = process.env) {
  return cleanString(env.GHL_INBOUND_WEBHOOK_URL || env.GHL_WEBHOOK_URL, 2000);
}

export function buildBookingIntentAutomationPayload({
  locationId,
  contactId,
  opportunityId,
  booking,
  reservationStatus,
  paymentStatus,
  calendarStatus = "not_blocked"
}) {
  return {
    event_type: "booking_intent_created",
    event_created_at: new Date().toISOString(),
    source: "EEKOS Website",
    location_id: cleanString(locationId, 120),
    contact_id: cleanString(contactId, 120),
    opportunity_id: cleanString(opportunityId, 120),
    reservation_reference: cleanString(booking.reference, 120),
    room_id: cleanString(booking.roomId, 120),
    room_name: cleanString(booking.roomName, 120),
    checkin_date: cleanString(booking.checkin, 40),
    checkout_date: cleanString(booking.checkout, 40),
    adults: toInteger(booking.adults),
    children: toInteger(booking.children),
    guest_name: cleanString(booking.fullName, 160),
    email: cleanString(booking.email, 160),
    phone: cleanString(booking.phone, 40),
    arrival_time: cleanString(booking.arrivalTime, 80),
    special_requests: cleanString(booking.specialRequests, 500),
    final_total_amount: toNumber(booking.total),
    deposit_amount_due: toNumber(booking.deposit),
    balance_due: toNumber(booking.balance),
    reservation_status: cleanString(reservationStatus, 80),
    payment_status: cleanString(paymentStatus, 80),
    calendar_status: cleanString(calendarStatus, 80)
  };
}

export async function dispatchInboundWebhook(webhookUrl, payload) {
  if (!webhookUrl) {
    return {
      ok: false,
      skipped: true,
      reason: "missing_webhook_url"
    };
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify(payload)
  });

  const text = await response.text();
  let json = null;

  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  return {
    ok: response.ok,
    skipped: false,
    status: response.status,
    statusText: response.statusText,
    body: json || text || null
  };
}
