import crypto from "node:crypto";

import { PAYMENT_CONFIG } from "../../src/js/config.js";

export const PAYMONGO_API_BASE_URL = "https://api.paymongo.com/v1";
const DEFAULT_PAYMENT_METHOD_TYPES = ["card", "gcash"];
const CHECKOUT_ROUTE = "/checkout_sessions";

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

function parseCommaSeparatedList(value) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value
      .flatMap((entry) => String(entry).split(","))
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return String(value)
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

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

function toInteger(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toMinorAmount(amount) {
  return Math.max(Math.round(toNumber(amount) * 100), 0);
}

export function fromMinorAmount(amount) {
  const parsed = typeof amount === "number" ? amount : Number(amount);
  return Number.isFinite(parsed) ? parsed / 100 : 0;
}

export function resolvePaymongoConfig(env = process.env, paymentConfig = PAYMENT_CONFIG) {
  const paymentMethodTypes = parseCommaSeparatedList(env.PAYMONGO_PAYMENT_METHOD_TYPES);
  const appBaseUrl = cleanString(env.APP_BASE_URL, 240);
  const successUrl = cleanString(env.PAYMONGO_SUCCESS_URL, 240) || (appBaseUrl ? `${appBaseUrl}/payment-success` : "");
  const cancelUrl = cleanString(env.PAYMONGO_CANCEL_URL, 240) || (appBaseUrl ? `${appBaseUrl}/payment-cancelled` : "");

  return {
    secretKey: cleanString(env.PAYMONGO_SECRET_KEY, 200),
    webhookSecret: cleanString(env.PAYMONGO_WEBHOOK_SECRET, 200),
    appBaseUrl,
    successUrl,
    cancelUrl,
    currency: cleanString(env.PAYMONGO_CURRENCY || paymentConfig.currency || "PHP", 10).toUpperCase(),
    depositType: cleanString(paymentConfig.depositType || "percentage", 40),
    depositValue: toNumber(paymentConfig.depositValue),
    paymentMethodTypes: paymentMethodTypes.length > 0 ? paymentMethodTypes : DEFAULT_PAYMENT_METHOD_TYPES,
    openInNewTab: Boolean(paymentConfig.openInNewTab)
  };
}

export function isPaymongoConfigReady(config) {
  return Boolean(
    config?.secretKey
    && config?.webhookSecret
    && config?.appBaseUrl
    && config?.successUrl
    && config?.cancelUrl
  );
}

export function buildPaymongoAuthHeader(secretKey) {
  const credentials = Buffer.from(`${secretKey}:`).toString("base64");
  return `Basic ${credentials}`;
}

export async function fetchPaymongoJson(path, secretKey, init = {}) {
  const response = await fetch(`${PAYMONGO_API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: buildPaymongoAuthHeader(secretKey),
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init.headers || {})
    }
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
    status: response.status,
    statusText: response.statusText,
    headers: {
      requestId: cleanString(response.headers.get("request-id"), 120),
      xRequestId: cleanString(response.headers.get("x-request-id"), 120),
      contentType: cleanString(response.headers.get("content-type"), 160)
    },
    body: json || text
  };
}

export function appendQueryParams(url, params = {}) {
  const nextUrl = new URL(url);

  Object.entries(params).forEach(([key, value]) => {
    const normalized = cleanString(value, 160);

    if (normalized) {
      nextUrl.searchParams.set(key, normalized);
    }
  });

  return nextUrl.toString();
}

export function buildPaymongoCheckoutPayload({ booking, room, financials, paymongoConfig, successUrl, cancelUrl }) {
  const totalAmount = toNumber(financials.total);
  const depositAmount = toNumber(financials.deposit) > 0 ? toNumber(financials.deposit) : totalAmount;
  const balanceAmount = totalAmount > 0 ? Math.max(totalAmount - depositAmount, 0) : 0;
  const amountDueMinor = toMinorAmount(depositAmount);
  const totalAmountMinor = toMinorAmount(totalAmount);
  const balanceAmountMinor = toMinorAmount(balanceAmount);
  const nights = toInteger(financials.nights);
  const currency = paymongoConfig.currency || "PHP";
  const description = `${room.name} stay for ${nights || 1} ${nights === 1 ? "night" : "nights"} from ${booking.checkin} to ${booking.checkout}`;

  return {
    data: {
      attributes: {
        billing: {
          name: cleanString(booking.fullName, 160),
          email: cleanString(booking.email, 160),
          phone: cleanString(booking.phone, 40)
        },
        cancel_url: cancelUrl,
        success_url: successUrl,
        description,
        line_items: [
          {
            amount: amountDueMinor,
            currency,
            description: `Deposit payment to secure the reservation for ${room.name}`,
            name: `EEKOS Deposit - ${room.name}`,
            quantity: 1
          }
        ],
        metadata: {
          source: "eekos_website",
          reservation_reference: cleanString(booking.reference, 120),
          room_id: cleanString(booking.roomId, 120),
          room_name: cleanString(booking.roomName || room.name, 120),
          checkin_date: cleanString(booking.checkin, 40),
          checkout_date: cleanString(booking.checkout, 40),
          adults: String(toInteger(booking.adults)),
          children: String(toInteger(booking.children)),
          guest_name: cleanString(booking.fullName, 160),
          email: cleanString(booking.email, 160),
          phone: cleanString(booking.phone, 40),
          arrival_time: cleanString(booking.arrivalTime, 80),
          special_requests: cleanString(booking.specialRequests, 500),
          pricing_source: cleanString(booking.pricingSource, 40),
          currency,
          total_amount: String(totalAmount),
          total_amount_minor: String(totalAmountMinor),
          deposit_amount_due: String(depositAmount),
          deposit_amount_due_minor: String(amountDueMinor),
          balance_due: String(balanceAmount),
          balance_due_minor: String(balanceAmountMinor),
          ghl_contact_id: cleanString(booking.ghlContactId, 120),
          ghl_opportunity_id: cleanString(booking.ghlOpportunityId, 120)
        },
        payment_method_types: paymongoConfig.paymentMethodTypes,
        reference_number: cleanString(booking.reference, 120),
        send_email_receipt: true,
        show_description: true,
        show_line_items: true
      }
    }
  };
}

export function parsePaymongoSignatureHeader(headerValue) {
  const parsed = { timestamp: "", testSignature: "", liveSignature: "" };

  String(headerValue || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .forEach((entry) => {
      const [key, ...rest] = entry.split("=");
      const value = rest.join("=").trim();

      if (key === "t") {
        parsed.timestamp = value;
      }

      if (key === "te") {
        parsed.testSignature = value;
      }

      if (key === "li") {
        parsed.liveSignature = value;
      }
    });

  return parsed;
}

function timingSafeEqual(a, b) {
  const first = Buffer.from(a || "", "utf8");
  const second = Buffer.from(b || "", "utf8");

  if (first.length !== second.length || first.length === 0) {
    return false;
  }

  return crypto.timingSafeEqual(first, second);
}

export function verifyPaymongoWebhookSignature(secret, headerValue, rawBody) {
  const parsed = parsePaymongoSignatureHeader(headerValue);

  if (!secret || !parsed.timestamp || !rawBody) {
    return false;
  }

  const payloadToSign = `${parsed.timestamp}.${rawBody}`;
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payloadToSign)
    .digest("hex");

  return timingSafeEqual(expectedSignature, parsed.testSignature)
    || timingSafeEqual(expectedSignature, parsed.liveSignature);
}

export async function readRawRequestBody(req) {
  if (Buffer.isBuffer(req.body)) {
    return req.body.toString("utf8");
  }

  if (typeof req.body === "string") {
    return req.body;
  }

  if (req.rawBody) {
    return Buffer.isBuffer(req.rawBody) ? req.rawBody.toString("utf8") : String(req.rawBody);
  }

  const chunks = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString("utf8");
}

export function extractPaymongoEventContext(payload) {
  const eventAttributes = payload?.data?.attributes || {};
  const eventType = cleanString(eventAttributes.type, 120);
  const resource = eventAttributes.data || {};
  const resourceAttributes = resource?.attributes || {};
  const primaryPayment = Array.isArray(resourceAttributes.payments) ? resourceAttributes.payments[0] : null;
  const paymentAttributes = primaryPayment?.attributes || {};
  const metadata = resourceAttributes.metadata || paymentAttributes.metadata || {};

  const paymentReference = cleanString(
    primaryPayment?.id
      || paymentAttributes.reference_number
      || resourceAttributes.reference_number
      || metadata.payment_reference,
    160
  );

  return {
    eventType,
    livemode: Boolean(eventAttributes.livemode),
    resourceId: cleanString(resource?.id, 120),
    resourceType: cleanString(resource?.type, 80),
    metadata,
    paymentReference,
    paidAt: cleanString(
      paymentAttributes.paid_at
        || paymentAttributes.created_at
        || resourceAttributes.paid_at
        || resourceAttributes.created_at,
      80
    ),
    amountPaid: fromMinorAmount(paymentAttributes.amount || resourceAttributes.amount || 0),
    rawResource: resource
  };
}

export function isHandledPaymongoEvent(eventType) {
  return [
    "checkout_session.payment.paid",
    "payment.paid",
    "payment.failed",
    "checkout_session.expired"
  ].includes(eventType);
}

export function resolvePaymongoCheckoutRoute() {
  return CHECKOUT_ROUTE;
}
