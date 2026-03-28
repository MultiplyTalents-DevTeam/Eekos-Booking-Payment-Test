import test from "node:test";
import assert from "node:assert/strict";

import {
  buildPaymentHandoffUrl,
  buildPaymentPayload,
  createBookingReference,
  hasLivePaymentUrl,
  sanitizeParamValue
} from "../src/js/lib/payment.js";

test("hasLivePaymentUrl rejects the placeholder value", () => {
  assert.equal(hasLivePaymentUrl("YOUR_GHL_PAYMENT_LINK_OR_ORDER_FORM_URL_HERE"), false);
  assert.equal(hasLivePaymentUrl("https://pay.example.com/checkout"), true);
});

test("sanitizeParamValue strips control characters and trims input", () => {
  assert.equal(sanitizeParamValue("  John\n\tDoe  "), "John Doe");
});

test("buildPaymentPayload omits blank values and encodes the rest", () => {
  const params = buildPaymentPayload({
    room: "Suite",
    special_requests: "",
    reference: "EEKOS-12345678"
  });

  assert.equal(params.toString(), "room=Suite&reference=EEKOS-12345678");
});

test("buildPaymentHandoffUrl appends encoded query params", () => {
  const url = buildPaymentHandoffUrl("https://pay.example.com/checkout", {
    room: "Suite with Balcony",
    reference: "EEKOS-12345678"
  });

  assert.equal(
    url,
    "https://pay.example.com/checkout?room=Suite+with+Balcony&reference=EEKOS-12345678"
  );
});

test("createBookingReference uses the last eight digits of the timestamp", () => {
  assert.equal(createBookingReference(1712345678901), "EEKOS-45678901");
});

