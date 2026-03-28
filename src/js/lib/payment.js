import { PAYMENT_URL_PLACEHOLDER } from "../config.js";

export function hasLivePaymentUrl(paymentUrl) {
  const normalized = String(paymentUrl || "").trim();
  return normalized !== "" && normalized !== PAYMENT_URL_PLACEHOLDER;
}

export function sanitizeParamValue(value, maxLength = 500) {
  return String(value ?? "")
    .replace(/[\u0000-\u001F\u007F]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function buildPaymentPayload(payload) {
  const sanitizedEntries = Object.entries(payload).reduce((accumulator, [key, value]) => {
    const sanitizedValue = sanitizeParamValue(value, key === "special_requests" ? 500 : 160);

    if (sanitizedValue) {
      accumulator[key] = sanitizedValue;
    }

    return accumulator;
  }, {});

  return new URLSearchParams(sanitizedEntries);
}

export function buildPaymentHandoffUrl(paymentUrl, payload) {
  if (!hasLivePaymentUrl(paymentUrl)) {
    return null;
  }

  const params = buildPaymentPayload(payload).toString();
  const separator = paymentUrl.includes("?") ? "&" : "?";

  return params ? `${paymentUrl}${separator}${params}` : paymentUrl;
}

export function createBookingReference(now = Date.now()) {
  return `EEKOS-${String(now).slice(-8)}`;
}

