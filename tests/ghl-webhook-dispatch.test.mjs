import test from "node:test";
import assert from "node:assert/strict";

import {
  buildBookingIntentAutomationPayload,
  resolveInboundWebhookUrl
} from "../api/_lib/ghl-webhook-dispatch.js";

test("resolveInboundWebhookUrl supports preferred and legacy env var names", () => {
  assert.equal(
    resolveInboundWebhookUrl({ GHL_INBOUND_WEBHOOK_URL: "https://example.com/inbound" }),
    "https://example.com/inbound"
  );
  assert.equal(
    resolveInboundWebhookUrl({ GHL_WEBHOOK_URL: "https://example.com/legacy" }),
    "https://example.com/legacy"
  );
});

test("buildBookingIntentAutomationPayload creates a safe booking event payload", () => {
  const payload = buildBookingIntentAutomationPayload({
    locationId: "loc_123",
    contactId: "contact_123",
    opportunityId: "opp_123",
    reservationStatus: "awaiting_payment",
    paymentStatus: "pending",
    booking: {
      reference: "EEKOS-12345678",
      roomId: "suite-with-balcony",
      roomName: "Suite with Balcony",
      checkin: "2026-04-05",
      checkout: "2026-04-07",
      adults: "2",
      children: "1",
      fullName: "Jane Doe",
      email: "jane@example.com",
      phone: "+639171234567",
      arrivalTime: "3:00 PM",
      specialRequests: "Late arrival please",
      total: "7700",
      deposit: "2310",
      balance: "5390"
    }
  });

  assert.equal(payload.event_type, "booking_intent_created");
  assert.equal(payload.source, "EEKOS Website");
  assert.equal(payload.location_id, "loc_123");
  assert.equal(payload.contact_id, "contact_123");
  assert.equal(payload.opportunity_id, "opp_123");
  assert.equal(payload.reservation_reference, "EEKOS-12345678");
  assert.equal(payload.room_id, "suite-with-balcony");
  assert.equal(payload.room_name, "Suite with Balcony");
  assert.equal(payload.checkin_date, "2026-04-05");
  assert.equal(payload.checkout_date, "2026-04-07");
  assert.equal(payload.adults, 2);
  assert.equal(payload.children, 1);
  assert.equal(payload.guest_name, "Jane Doe");
  assert.equal(payload.email, "jane@example.com");
  assert.equal(payload.phone, "+639171234567");
  assert.equal(payload.arrival_time, "3:00 PM");
  assert.equal(payload.special_requests, "Late arrival please");
  assert.equal(payload.final_total_amount, 7700);
  assert.equal(payload.deposit_amount_due, 2310);
  assert.equal(payload.balance_due, 5390);
  assert.equal(payload.reservation_status, "awaiting_payment");
  assert.equal(payload.payment_status, "pending");
  assert.equal(payload.calendar_status, "not_blocked");
  assert.match(payload.event_created_at, /^\d{4}-\d{2}-\d{2}T/);
});
