import test from "node:test";
import assert from "node:assert/strict";

import {
  buildContactUpsertPayload,
  buildHoldExpiresAt,
  buildOpportunityCustomFields,
  buildOpportunityName,
  buildOpportunityPayload,
  splitFullName
} from "../src/js/lib/ghl-booking.js";

const config = {
  locationId: "loc_123",
  pipeline: {
    reservationsPipelineId: "pipe_123",
    stages: {
      waitingForPaymentStageId: "stage_waiting"
    }
  },
  customFields: {
    roomNameFieldId: "field_room",
    checkInDateFieldId: "field_checkin",
    checkOutDateFieldId: "field_checkout",
    reservationStatusFieldId: "field_reservation_status",
    paymentStatusFieldId: "field_payment_status",
    finalTotalAmountFieldId: "field_total",
    holdExpiresAtFieldId: "field_hold_expires_at",
    specialRequestsFieldId: "field_requests",
    adultCountFieldId: "field_adults",
    childCountFieldId: "field_children",
    paymentReferenceFieldId: "field_payment_reference"
  }
};

const booking = {
  roomName: "Suite with Balcony",
  checkin: "2026-04-05",
  checkout: "2026-04-07",
  adults: "2",
  children: "1",
  fullName: "Jane Doe",
  email: "jane@example.com",
  phone: "+639171234567",
  specialRequests: "Late arrival please",
  reference: "EEKOS-12345678",
  total: "7700",
  createdAt: "2026-03-31T10:00:00.000Z"
};

test("splitFullName separates first and last name", () => {
  assert.deepEqual(splitFullName("Jane Marie Doe"), {
    firstName: "Jane Marie",
    lastName: "Doe"
  });
});

test("buildOpportunityName includes room, guest, and reference", () => {
  assert.equal(
    buildOpportunityName(booking),
    "Suite with Balcony - Jane Doe - EEKOS-12345678"
  );
});

test("buildHoldExpiresAt adds twenty minutes by default", () => {
  assert.equal(buildHoldExpiresAt(booking), "2026-03-31T10:20:00.000Z");
});

test("buildContactUpsertPayload prepares a clean GHL contact payload", () => {
  assert.deepEqual(buildContactUpsertPayload("loc_123", booking), {
    locationId: "loc_123",
    firstName: "Jane",
    lastName: "Doe",
    name: "Jane Doe",
    email: "jane@example.com",
    phone: "+639171234567",
    source: "EEKOS Website"
  });
});

test("buildOpportunityCustomFields maps configured EEKOS fields to GHL ids", () => {
  assert.deepEqual(buildOpportunityCustomFields(config, booking), [
    { id: "field_room", value: "Suite with Balcony" },
    { id: "field_checkin", value: "2026-04-05" },
    { id: "field_checkout", value: "2026-04-07" },
    { id: "field_reservation_status", value: "waiting_for_payment" },
    { id: "field_payment_status", value: "unpaid" },
    { id: "field_total", value: 7700 },
    { id: "field_hold_expires_at", value: "2026-03-31T10:20:00.000Z" },
    { id: "field_requests", value: "Late arrival please" },
    { id: "field_adults", value: 2 },
    { id: "field_children", value: 1 }
  ]);
});

test("buildOpportunityPayload creates the Waiting for Payment opportunity payload", () => {
  assert.deepEqual(buildOpportunityPayload(config, booking, "contact_123"), {
    locationId: "loc_123",
    contactId: "contact_123",
    name: "Suite with Balcony - Jane Doe - EEKOS-12345678",
    pipelineId: "pipe_123",
    pipelineStageId: "stage_waiting",
    status: "open",
    source: "EEKOS Website",
    monetaryValue: 7700,
    customFields: [
      { id: "field_room", value: "Suite with Balcony" },
      { id: "field_checkin", value: "2026-04-05" },
      { id: "field_checkout", value: "2026-04-07" },
      { id: "field_reservation_status", value: "waiting_for_payment" },
      { id: "field_payment_status", value: "unpaid" },
      { id: "field_total", value: 7700 },
      { id: "field_hold_expires_at", value: "2026-03-31T10:20:00.000Z" },
      { id: "field_requests", value: "Late arrival please" },
      { id: "field_adults", value: 2 },
      { id: "field_children", value: 1 }
    ]
  });
});
