import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";

import {
  appendQueryParams,
  buildPaymongoCheckoutPayload,
  parsePaymongoSignatureHeader,
  resolvePaymongoConfig,
  verifyPaymongoWebhookSignature
} from "../api/_lib/paymongo.js";

test("resolvePaymongoConfig uses env overrides and defaults", () => {
  const config = resolvePaymongoConfig({
    PAYMONGO_SECRET_KEY: "sk_test_123",
    PAYMONGO_WEBHOOK_SECRET: "whsk_123",
    APP_BASE_URL: "https://example.com",
    PAYMONGO_SUCCESS_URL: "https://example.com/payment-success",
    PAYMONGO_CANCEL_URL: "https://example.com/payment-cancelled",
    PAYMONGO_PAYMENT_METHOD_TYPES: "card, gcash, maya"
  });

  assert.equal(config.secretKey, "sk_test_123");
  assert.equal(config.webhookSecret, "whsk_123");
  assert.deepEqual(config.paymentMethodTypes, ["card", "gcash", "maya"]);
  assert.equal(config.currency, "PHP");
});

test("appendQueryParams adds sanitized values to urls", () => {
  const url = appendQueryParams("https://example.com/payment-success", {
    reference: "EEKOS-12345678",
    room: "suite-with-balcony"
  });

  assert.equal(
    url,
    "https://example.com/payment-success?reference=EEKOS-12345678&room=suite-with-balcony"
  );
});

test("buildPaymongoCheckoutPayload prepares a deposit checkout request", () => {
  const payload = buildPaymongoCheckoutPayload({
    booking: {
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
      reference: "EEKOS-12345678",
      pricingSource: "reference",
      ghlContactId: "contact_123",
      ghlOpportunityId: "opp_123"
    },
    room: {
      id: "suite-with-balcony",
      name: "Suite with Balcony"
    },
    financials: {
      nights: 2,
      total: 7700,
      deposit: 2310,
      balance: 5390
    },
    paymongoConfig: {
      currency: "PHP",
      paymentMethodTypes: ["card", "gcash"]
    },
    successUrl: "https://example.com/payment-success?reference=EEKOS-12345678",
    cancelUrl: "https://example.com/payment-cancelled?reference=EEKOS-12345678"
  });

  const attributes = payload.data.attributes;

  assert.equal(attributes.line_items[0].amount, 231000);
  assert.equal(attributes.line_items[0].currency, "PHP");
  assert.equal(attributes.reference_number, "EEKOS-12345678");
  assert.equal(attributes.metadata.ghl_opportunity_id, "opp_123");
  assert.equal(attributes.metadata.deposit_amount_due, "2310");
  assert.equal(attributes.metadata.total_amount, "7700");
});

test("verifyPaymongoWebhookSignature validates test-mode signature values", () => {
  const secret = "whsk_test_secret";
  const rawBody = JSON.stringify({ test: true });
  const timestamp = "1710000000";
  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");
  const header = `t=${timestamp},te=${signature}`;

  assert.deepEqual(parsePaymongoSignatureHeader(header), {
    timestamp,
    testSignature: signature,
    liveSignature: ""
  });
  assert.equal(verifyPaymongoWebhookSignature(secret, header, rawBody), true);
  assert.equal(verifyPaymongoWebhookSignature(secret, `t=${timestamp},te=bad`, rawBody), false);
});
