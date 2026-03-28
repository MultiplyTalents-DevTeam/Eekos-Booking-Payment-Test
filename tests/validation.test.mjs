import test from "node:test";
import assert from "node:assert/strict";

import { getFilteredRooms } from "../src/js/lib/room-filters.js";
import { validateGuestDetails, validateStayDetails } from "../src/js/lib/validation.js";

test("getFilteredRooms filters and sorts rooms predictably", () => {
  const rooms = [
    { id: "a", guestBand: "1-2", size: 18, tags: ["Balcony"] },
    { id: "b", guestBand: "1-2", size: 30, tags: [] },
    { id: "c", guestBand: "3-4", size: 24, tags: ["Balcony"] }
  ];

  const result = getFilteredRooms(rooms, {
    guests: "1-2",
    sort: "size",
    balconyOnly: false
  });

  assert.deepEqual(result.map((room) => room.id), ["b", "a"]);
});

test("validateStayDetails catches missing and invalid date ranges", () => {
  assert.equal(validateStayDetails({ checkin: "", checkout: "" }).valid, false);
  assert.equal(validateStayDetails({ checkin: "2026-04-10", checkout: "2026-04-09" }).valid, false);
  assert.equal(validateStayDetails({ checkin: "2026-04-10", checkout: "2026-04-11" }).valid, true);
});

test("validateGuestDetails checks required fields, email, and phone", () => {
  assert.equal(validateGuestDetails({ fullName: "", email: "", phone: "" }).valid, false);
  assert.equal(validateGuestDetails({ fullName: "A", email: "bad", phone: "1234567" }).valid, false);
  assert.equal(validateGuestDetails({ fullName: "Alex Doe", email: "alex@example.com", phone: "+63 912 345 6789" }).valid, true);
});

test("validateStayDetails rejects check-in dates in the past", () => {
  const result = validateStayDetails({
    checkin: "2020-01-01",
    checkout: "2026-04-11"
  });

  assert.equal(result.valid, false);
  assert.equal(result.field, "checkin");
});

test("validateGuestDetails returns field-specific guidance", () => {
  const nameResult = validateGuestDetails({
    fullName: "A",
    email: "alex@example.com",
    phone: "+63 912 345 6789"
  });

  const phoneResult = validateGuestDetails({
    fullName: "Alex Doe",
    email: "alex@example.com",
    phone: "123"
  });

  assert.equal(nameResult.valid, false);
  assert.equal(nameResult.field, "fullName");
  assert.equal(phoneResult.valid, false);
  assert.equal(phoneResult.field, "phone");
});

