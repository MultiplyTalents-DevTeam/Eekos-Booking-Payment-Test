import { PAYMENT_CONFIG } from "./config.js";
import { formatCurrency, formatDateValue } from "./lib/booking.js";
import { loadBookingDraft, saveBookingDraft } from "./lib/booking-draft.js";
import { escapeAttribute, escapeHtml } from "./lib/escape.js";

function formatGuests(draft) {
  const adults = Number(draft.adults || 0);
  const children = Number(draft.children || 0);
  const parts = [];

  if (adults > 0) {
    parts.push(`${adults} ${adults === 1 ? "adult" : "adults"}`);
  }

  if (children > 0) {
    parts.push(`${children} ${children === 1 ? "child" : "children"}`);
  }

  return parts.join(", ") || "Guest details not set";
}

function parseAmount(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value !== "string") {
    return 0;
  }

  const normalized = value.replace(/[^\d.-]+/g, "");
  const amount = Number(normalized);

  return Number.isFinite(amount) ? amount : 0;
}

function resolveRateGuide(draft) {
  const rate = parseAmount(draft.rate);

  if (rate > 0) {
    return `${formatCurrency(rate, draft.currency || PAYMENT_CONFIG.currency)} / night`;
  }

  return "Final amount shown at checkout";
}

function resolveTotal(draft) {
  const total = parseAmount(draft.total);

  if (total > 0) {
    return formatCurrency(total, draft.currency || PAYMENT_CONFIG.currency);
  }

  return "Shown at checkout";
}

function resolveDeposit(draft) {
  const deposit = parseAmount(draft.deposit);

  if (deposit > 0) {
    return formatCurrency(deposit, draft.currency || PAYMENT_CONFIG.currency);
  }

  return "Shown at checkout";
}

function resolveBalance(draft) {
  const balance = parseAmount(draft.balance);

  if (balance > 0) {
    return formatCurrency(balance, draft.currency || PAYMENT_CONFIG.currency);
  }

  return "Shown at checkout";
}

function formatStayDates(draft) {
  if (!draft.checkin || !draft.checkout) {
    return "Stay dates not set";
  }

  return `${formatDateValue(draft.checkin)} - ${formatDateValue(draft.checkout)}`;
}

function formatNights(draft) {
  const nights = Number(draft.nights || 0);

  if (nights < 1) {
    return "-";
  }

  return `${nights} ${nights === 1 ? "night" : "nights"}`;
}

function formatCreatedAt(value) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function getPricingHeadline(draft) {
  return draft.pricingSource === "reference"
    ? "Estimated from public rate guide"
    : "Estimated total";
}

function getPricingCopy(draft) {
  return draft.pricingSource === "reference"
    ? "This review uses the public room rate guide so guests can understand the likely cost before checkout. The hosted checkout still confirms the final payable amount before payment."
    : "Final amount is shown again on secure checkout before payment completes. Your room is confirmed after successful payment.";
}

async function createBookingIntent(draft) {
  const response = await fetch("/api/ghl-booking-intent", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({
      roomId: draft.roomId || "",
      roomName: draft.roomName || "",
      checkin: draft.checkin || "",
      checkout: draft.checkout || "",
      adults: draft.adults || "",
      children: draft.children || "",
      fullName: draft.fullName || "",
      email: draft.email || "",
      phone: draft.phone || "",
      arrivalTime: draft.arrivalTime || "",
      specialRequests: draft.specialRequests || "",
      reference: draft.reference || "",
      total: draft.total || "",
      deposit: draft.deposit || "",
      balance: draft.balance || "",
      createdAt: draft.createdAt || ""
    })
  });

  let payload = null;

  try {
    payload = await response.json();
  } catch (error) {
    payload = null;
  }

  if (!response.ok || !payload?.ok) {
    return {
      ok: false,
      error: payload?.error || payload?.body?.message || payload?.statusText || "Unable to record booking intent in GHL."
    };
  }

  return {
    ok: true,
    contactId: payload.contactId || "",
    opportunityId: payload.opportunityId || "",
    reservationStatus: payload.reservationStatus || "awaiting_payment",
    paymentStatus: payload.paymentStatus || "pending"
  };
}

async function createCheckoutSession(draft) {
  const response = await fetch("/api/paymongo/create-checkout", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({
      roomId: draft.roomId || "",
      roomName: draft.roomName || "",
      checkin: draft.checkin || "",
      checkout: draft.checkout || "",
      adults: draft.adults || "",
      children: draft.children || "",
      fullName: draft.fullName || "",
      email: draft.email || "",
      phone: draft.phone || "",
      arrivalTime: draft.arrivalTime || "",
      specialRequests: draft.specialRequests || "",
      reference: draft.reference || "",
      pricingSource: draft.pricingSource || "",
      ghlContactId: draft.ghlContactId || "",
      ghlOpportunityId: draft.ghlOpportunityId || ""
    })
  });

  let payload = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok || !payload?.ok) {
    return {
      ok: false,
      error: payload?.error || payload?.body?.errors?.[0]?.detail || "Unable to prepare PayMongo checkout."
    };
  }

  return {
    ok: true,
    checkoutUrl: payload.checkoutUrl || "",
    checkoutSessionId: payload.checkoutSessionId || ""
  };
}

function renderEmptyState() {
  return `
    <section id="eekos-room-selector" class="eekos-payment-page-root">
      <div class="eekos-payment-page-shell">
        <div class="eekos-payment-empty">
          <h1 class="eekos-booking-title">No booking details found</h1>
          <p class="eekos-section-copy">Start from room selection so we can prepare your payment review.</p>
          <a class="eekos-btn eekos-btn--primary" href="./index.html#eekos-room-selector">Back to rooms</a>
        </div>
      </div>
    </section>
  `;
}

function renderPaymentPage(draft) {
  const bookingUrl = draft.roomId
    ? `./booking.html?room=${encodeURIComponent(draft.roomId)}`
    : "./index.html#eekos-room-selector";
  const checkoutButtonLabel = PAYMENT_CONFIG.openInNewTab
    ? "Open secure checkout"
    : "Continue to secure checkout";

  return `
    <section id="eekos-room-selector" class="eekos-payment-page-root">
      <div class="eekos-payment-page-shell">
        <header class="eekos-booking-page-header">
          <a class="eekos-booking-page-back" href="${escapeAttribute(bookingUrl)}">Back to booking details</a>
        </header>

        <section class="eekos-payment-stage" aria-label="Checkout progress">
          <span class="is-complete">Stay details</span>
          <span class="is-active">Payment review</span>
          <span>Secure checkout</span>
        </section>

        <div class="eekos-payment-hero">
          <div class="eekos-payment-hero-copy">
            <p class="eekos-booking-kicker">Payment review</p>
            <h1 class="eekos-booking-title">Review your stay before checkout</h1>
            <p class="eekos-section-copy">
              Confirm the room, dates, guest details, and payment summary before continuing to the secure hosted checkout.
            </p>
          </div>

          <div class="eekos-payment-reference-card">
            <span>Booking reference</span>
            <strong>${escapeHtml(draft.reference || "-")}</strong>
            <small>${escapeHtml(formatCreatedAt(draft.createdAt))}</small>
          </div>
        </div>

        <p class="eekos-form-feedback" id="eekos-payment-feedback" role="alert" aria-live="polite"></p>

        <section class="eekos-payment-stay-card" aria-label="Stay summary">
          <div class="eekos-payment-stay-main">
            <p class="eekos-summary-rate">Selected stay</p>
            <h2 class="eekos-summary-highlight">${escapeHtml(draft.roomName || "Room")}</h2>
            <p class="eekos-summary-copy">${escapeHtml(formatStayDates(draft))}</p>
          </div>

          <div class="eekos-payment-stay-facts">
            <div><span>Guests</span><strong>${escapeHtml(formatGuests(draft))}</strong></div>
            <div><span>Nights</span><strong>${escapeHtml(formatNights(draft))}</strong></div>
            <div><span>Rate guide</span><strong>${escapeHtml(resolveRateGuide(draft))}</strong></div>
          </div>
        </section>

        <section class="eekos-payment-pricing-card" aria-label="Payment summary">
          <div class="eekos-payment-pricing-top">
            <div>
              <p class="eekos-summary-rate">Payment summary</p>
              <h2 class="eekos-payment-pricing-total">${escapeHtml(resolveTotal(draft))}</h2>
              <p class="eekos-payment-pricing-copy">
                ${escapeHtml(getPricingCopy(draft))}
              </p>
            </div>

            <div class="eekos-payment-pricing-grid">
              <div>
                <span>${escapeHtml(getPricingHeadline(draft))}</span>
                <strong>${escapeHtml(resolveTotal(draft))}</strong>
              </div>
              <div>
                <span>Deposit due now</span>
                <strong>${escapeHtml(resolveDeposit(draft))}</strong>
              </div>
              <div>
                <span>Balance at property</span>
                <strong>${escapeHtml(resolveBalance(draft))}</strong>
              </div>
            </div>
          </div>

          <div class="eekos-payment-trust-points">
            <span>Final amount shown before payment</span>
            <span>Secure hosted checkout</span>
            <span>Reservation confirmed after deposit payment</span>
          </div>

          <div class="eekos-form-actions eekos-form-actions--spacious eekos-payment-actions">
            <a class="eekos-btn eekos-btn--ghost" href="${escapeAttribute(bookingUrl)}">Edit booking</a>
            <button
              type="button"
              class="eekos-btn eekos-btn--primary"
              id="eekos-checkout-button"
              aria-disabled="false"
            >
              ${escapeHtml(checkoutButtonLabel)}
            </button>
          </div>

          <p class="eekos-micro" id="eekos-payment-note">
            Reservation requests can be submitted now, but the room is only secured after successful deposit payment on the PayMongo checkout page.
          </p>
        </section>

        <div class="eekos-payment-detail-grid">
          <section class="eekos-payment-detail-card">
            <p class="eekos-summary-rate">Guest details</p>
            <div class="eekos-summary-list">
              <div class="eekos-summary-row">
                <span>Guest name</span>
                <strong>${escapeHtml(draft.fullName || "-")}</strong>
              </div>
              <div class="eekos-summary-row">
                <span>Email</span>
                <strong>${escapeHtml(draft.email || "-")}</strong>
              </div>
              <div class="eekos-summary-row">
                <span>Phone</span>
                <strong>${escapeHtml(draft.phone || "-")}</strong>
              </div>
              <div class="eekos-summary-row">
                <span>Arrival time</span>
                <strong>${escapeHtml(draft.arrivalTime || "Not set")}</strong>
              </div>
            </div>
          </section>

          <section class="eekos-payment-detail-card">
            <p class="eekos-summary-rate">Special requests</p>
            <p class="eekos-summary-copy eekos-summary-copy--full">
              ${escapeHtml(draft.specialRequests || "No special requests added.")}
            </p>
          </section>

          <section class="eekos-payment-detail-card">
            <p class="eekos-summary-rate">What happens next</p>
            <ul class="eekos-payment-policy-list">
              <li>Checkout opens on a secure hosted page.</li>
              <li>The final amount and deposit due are shown again before payment is completed.</li>
              <li>If payment is not completed, the room remains available for other guests.</li>
            </ul>
          </section>
        </div>
      </div>
    </section>
  `;
}

function mountPaymentPage() {
  const root = document.getElementById("payment-page-app");

  if (!root) {
    return;
  }

  let draft = loadBookingDraft();

  if (!draft) {
    root.innerHTML = renderEmptyState();
    return;
  }

  root.innerHTML = renderPaymentPage(draft);

  const feedback = document.getElementById("eekos-payment-feedback");
  const checkoutButton = document.getElementById("eekos-checkout-button");

  if (!checkoutButton || !feedback) {
    return;
  }

  function setFeedback(message) {
    feedback.textContent = message;
    feedback.dataset.state = "error";
  }

  function clearFeedback() {
    feedback.textContent = "";
    feedback.removeAttribute("data-state");
  }

  checkoutButton.addEventListener("click", async () => {
    clearFeedback();

    const originalButtonLabel = checkoutButton.textContent;
    checkoutButton.disabled = true;
    checkoutButton.classList.add("is-disabled");
    checkoutButton.textContent = "Preparing checkout...";

    if (!draft.ghlOpportunityId || !draft.ghlContactId) {
      const bookingIntent = await createBookingIntent(draft);

      if (!bookingIntent.ok) {
        setFeedback(`${bookingIntent.error} Update your GHL scopes, IDs, or token before using this as a live booking flow.`);
        checkoutButton.disabled = false;
        checkoutButton.classList.remove("is-disabled");
        checkoutButton.textContent = originalButtonLabel;
        return;
      }

      draft = {
        ...draft,
        ghlContactId: bookingIntent.contactId,
        ghlOpportunityId: bookingIntent.opportunityId,
        reservationStatus: bookingIntent.reservationStatus,
        paymentStatus: bookingIntent.paymentStatus,
        ghlSyncedAt: new Date().toISOString()
      };

      saveBookingDraft(draft);
    }

    const checkoutSession = await createCheckoutSession(draft);

    if (!checkoutSession.ok || !checkoutSession.checkoutUrl) {
      setFeedback(`${checkoutSession.error} Secure checkout could not be prepared right now.`);
      checkoutButton.disabled = false;
      checkoutButton.classList.remove("is-disabled");
      checkoutButton.textContent = originalButtonLabel;
      return;
    }

    draft = {
      ...draft,
      paymongoCheckoutSessionId: checkoutSession.checkoutSessionId,
      checkoutPreparedAt: new Date().toISOString()
    };

    saveBookingDraft(draft);

    if (PAYMENT_CONFIG.openInNewTab) {
      const paymentWindow = window.open(checkoutSession.checkoutUrl, "_blank", "noopener");

      if (!paymentWindow) {
        window.location.assign(checkoutSession.checkoutUrl);
        return;
      }

      checkoutButton.disabled = false;
      checkoutButton.classList.remove("is-disabled");
      checkoutButton.textContent = originalButtonLabel;
      return;
    }

    window.location.assign(checkoutSession.checkoutUrl);
  });
}

if (typeof document !== "undefined") {
  mountPaymentPage();
}
