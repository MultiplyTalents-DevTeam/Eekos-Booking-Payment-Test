import { INQUIRE_URL, PAYMENT_CONFIG, ROOM_PRICING_TEXT } from "./config.js";
import { ROOM_DATA } from "./data/rooms.js";
import {
  buildGuestSummary,
  formatCurrency,
  formatDateValue,
  getBookingPreviewFinancials,
  getRoomDisplayRate
} from "./lib/booking.js";
import { loadBookingDraft, saveBookingDraft } from "./lib/booking-draft.js";
import { escapeAttribute, escapeHtml } from "./lib/escape.js";
import { createBookingReference } from "./lib/payment.js";
import { syncDateInputMinimums, validateGuestDetails, validateStayDetails } from "./lib/validation.js";

function getRoomFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const roomId = params.get("room") || "";
  return ROOM_DATA.find((room) => room.id === roomId) || ROOM_DATA[0] || null;
}

function resolveInquireUrl() {
  if (INQUIRE_URL.startsWith("#")) {
    return `./index.html${INQUIRE_URL}`;
  }

  return INQUIRE_URL;
}

function getRoomRateText(room) {
  const displayRate = getRoomDisplayRate(room);

  if (!displayRate) {
    return ROOM_PRICING_TEXT.cardRateUnavailable;
  }

  return `From ${formatCurrency(displayRate, PAYMENT_CONFIG.currency)} / night`;
}

function renderBookingPage(room) {
  const heroImage = (room.images || []).find(Boolean) || "";
  const bookingBackUrl = `./room.html?room=${encodeURIComponent(room.id)}`;

  return `
    <section id="eekos-room-selector" class="eekos-booking-page-root" aria-label="EEKOS booking">
      <div class="eekos-booking-page-shell">
        <header class="eekos-booking-page-header">
          <a class="eekos-booking-page-back" href="${escapeAttribute(bookingBackUrl)}">Back to room details</a>
        </header>

        <div class="eekos-booking-dialog eekos-booking-dialog--page">
          <div class="eekos-booking-main">
            <div class="eekos-booking-top eekos-booking-top--page">
              <div>
                <p class="eekos-booking-kicker">Secure your stay</p>
                <h1 class="eekos-booking-title">Booking details</h1>
              </div>
            </div>

            <p class="eekos-form-feedback" id="eekos-booking-feedback" role="alert" aria-live="polite"></p>

            <form id="eekos-booking-page-form" novalidate>
              <div class="eekos-booking-section">
                <h2 class="eekos-section-label">Stay details</h2>
                <p class="eekos-section-copy">
                  Select your dates and guest count first. Guests should review the final amount before continuing to payment.
                </p>

                <div class="eekos-field-grid">
                  <div class="eekos-field">
                    <label for="eekos-checkin">Check-in</label>
                    <input type="date" id="eekos-checkin" name="checkin" required>
                    <div class="eekos-field-error" id="eekos-error-checkin" aria-live="polite"></div>
                  </div>

                  <div class="eekos-field">
                    <label for="eekos-checkout">Check-out</label>
                    <input type="date" id="eekos-checkout" name="checkout" required>
                    <div class="eekos-field-error" id="eekos-error-checkout" aria-live="polite"></div>
                  </div>

                  <div class="eekos-field">
                    <label for="eekos-adults">Adults</label>
                    <select id="eekos-adults" name="adults" required>
                      <option value="1">1 adult</option>
                      <option value="2" selected>2 adults</option>
                      <option value="3">3 adults</option>
                      <option value="4">4 adults</option>
                      <option value="5">5 adults</option>
                      <option value="6">6 adults</option>
                    </select>
                    <div class="eekos-field-error" id="eekos-error-adults" aria-live="polite"></div>
                  </div>

                  <div class="eekos-field">
                    <label for="eekos-children">Children</label>
                    <select id="eekos-children" name="children">
                      <option value="0" selected>0 children</option>
                      <option value="1">1 child</option>
                      <option value="2">2 children</option>
                      <option value="3">3 children</option>
                      <option value="4">4 children</option>
                    </select>
                    <div class="eekos-field-error" id="eekos-error-children" aria-live="polite"></div>
                  </div>
                </div>
              </div>

              <div class="eekos-booking-section">
                <h2 class="eekos-section-label">Guest details</h2>
                <p class="eekos-section-copy">
                  Use contact details that can receive booking and payment updates.
                </p>

                <div class="eekos-field-grid">
                  <div class="eekos-field">
                    <label for="eekos-full-name">Full name</label>
                    <input type="text" id="eekos-full-name" name="full_name" autocomplete="name" maxlength="120" required>
                    <div class="eekos-field-error" id="eekos-error-full_name" aria-live="polite"></div>
                  </div>

                  <div class="eekos-field">
                    <label for="eekos-email">Email address</label>
                    <input type="email" id="eekos-email" name="email" autocomplete="email" maxlength="160" required>
                    <div class="eekos-field-error" id="eekos-error-email" aria-live="polite"></div>
                  </div>

                  <div class="eekos-field">
                    <label for="eekos-phone">Phone number</label>
                    <input type="tel" id="eekos-phone" name="phone" autocomplete="tel" maxlength="32" required>
                    <div class="eekos-field-error" id="eekos-error-phone" aria-live="polite"></div>
                  </div>

                  <div class="eekos-field">
                    <label for="eekos-arrival-time">Estimated arrival time</label>
                    <input type="text" id="eekos-arrival-time" name="arrival_time" maxlength="40" placeholder="Example: 3:00 PM">
                    <div class="eekos-field-error" id="eekos-error-arrival_time" aria-live="polite"></div>
                  </div>

                  <div class="eekos-field eekos-field--full">
                    <label for="eekos-special-requests">Special requests</label>
                    <textarea
                      id="eekos-special-requests"
                      name="special_requests"
                      maxlength="500"
                      placeholder="Arrival time, bed preference, accessibility notes, or any special request."
                    ></textarea>
                    <div class="eekos-field-error" id="eekos-error-special_requests" aria-live="polite"></div>
                  </div>
                </div>
              </div>

              <p class="eekos-micro" id="eekos-booking-note">
                Your reservation is confirmed only after successful payment on the secure checkout page.
              </p>

              <div class="eekos-form-actions eekos-form-actions--spacious">
                <a class="eekos-btn eekos-btn--ghost" href="${escapeAttribute(bookingBackUrl)}">Back to room</a>
                <button type="submit" class="eekos-btn eekos-btn--primary" id="eekos-booking-submit">Continue to payment review</button>
              </div>
            </form>
          </div>

          <aside class="eekos-booking-side">
            <div class="eekos-booking-room-card">
              <img src="${escapeAttribute(heroImage)}" alt="${escapeAttribute(room.name)} room preview">
              <div class="eekos-booking-room-copy">
                <p class="eekos-summary-rate">Selected room</p>
                <h2 class="eekos-summary-room-name" id="eekos-summary-room-name">${escapeHtml(room.name)}</h2>
                <p class="eekos-summary-copy">${escapeHtml(getRoomRateText(room))}</p>
              </div>
            </div>

            <div class="eekos-summary-card">
              <p class="eekos-summary-rate">Stay summary</p>
              <div class="eekos-summary-list">
                <div class="eekos-summary-row">
                  <span>Guests</span>
                  <strong id="eekos-summary-guests">2 adults</strong>
                </div>
                <div class="eekos-summary-row">
                  <span>Stay dates</span>
                  <strong id="eekos-summary-dates">Select dates</strong>
                </div>
                <div class="eekos-summary-row">
                  <span>Nights</span>
                  <strong id="eekos-summary-nights">-</strong>
                </div>
                <div class="eekos-summary-row">
                  <span>Bed setup</span>
                  <strong>${escapeHtml(room.beds)}</strong>
                </div>
                <div class="eekos-summary-row">
                  <span>Room size</span>
                  <strong>${escapeHtml(String(room.size))} sq m</strong>
                </div>
              </div>
            </div>

            <div class="eekos-summary-payment">
              <p class="eekos-summary-title">Price review</p>
              <p class="eekos-summary-highlight" id="eekos-summary-price-state">Choose dates to review estimate</p>
              <p class="eekos-summary-copy" id="eekos-summary-price-copy">
                Guests should see final amount and payment terms before checkout.
              </p>

              <div class="eekos-summary-list">
                <div class="eekos-summary-row">
                  <span>Rate guide</span>
                  <strong id="eekos-summary-rate">${escapeHtml(getRoomRateText(room))}</strong>
                </div>
                <div class="eekos-summary-row">
                  <span>Estimated total</span>
                  <strong id="eekos-summary-total">-</strong>
                </div>
                <div class="eekos-summary-row">
                  <span>Deposit due now</span>
                  <strong id="eekos-summary-deposit">-</strong>
                </div>
                <div class="eekos-summary-row">
                  <span>Balance at property</span>
                  <strong id="eekos-summary-balance">-</strong>
                </div>
              </div>
            </div>

            <div class="eekos-summary-policy">
              <p class="eekos-summary-title">Booking notes</p>
              <ul>
                <li>Final amount is confirmed on the checkout page before payment.</li>
                <li>Rooms are confirmed once payment is completed.</li>
                <li><a href="${escapeAttribute(resolveInquireUrl())}">Inquire instead</a> if you want to reserve without paying right now.</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </section>
  `;
}

function mountBookingPage() {
  const root = document.getElementById("booking-page-app");

  if (!root) {
    return;
  }

  const room = getRoomFromQuery();

  if (!room) {
    root.innerHTML = `
      <section id="eekos-room-selector" class="eekos-booking-page-root">
        <div class="eekos-booking-page-empty">
          <h1>Room not found</h1>
          <p>Return to room list and select a room again.</p>
          <a class="eekos-btn eekos-btn--primary" href="./index.html#eekos-room-selector">Back to rooms</a>
        </div>
      </section>
    `;
    return;
  }

  root.innerHTML = renderBookingPage(room);

  const form = document.getElementById("eekos-booking-page-form");
  const feedback = document.getElementById("eekos-booking-feedback");
  const bookingNote = document.getElementById("eekos-booking-note");
  const submitButton = document.getElementById("eekos-booking-submit");

  const checkinInput = document.getElementById("eekos-checkin");
  const checkoutInput = document.getElementById("eekos-checkout");
  const adultsInput = document.getElementById("eekos-adults");
  const childrenInput = document.getElementById("eekos-children");
  const fullNameInput = document.getElementById("eekos-full-name");
  const emailInput = document.getElementById("eekos-email");
  const phoneInput = document.getElementById("eekos-phone");
  const arrivalInput = document.getElementById("eekos-arrival-time");
  const specialRequestsInput = document.getElementById("eekos-special-requests");

  const summaryGuests = document.getElementById("eekos-summary-guests");
  const summaryDates = document.getElementById("eekos-summary-dates");
  const summaryNights = document.getElementById("eekos-summary-nights");
  const summaryRate = document.getElementById("eekos-summary-rate");
  const summaryTotal = document.getElementById("eekos-summary-total");
  const summaryDeposit = document.getElementById("eekos-summary-deposit");
  const summaryBalance = document.getElementById("eekos-summary-balance");
  const summaryPriceState = document.getElementById("eekos-summary-price-state");
  const summaryPriceCopy = document.getElementById("eekos-summary-price-copy");

  const fieldMap = {
    checkin: checkinInput,
    checkout: checkoutInput,
    fullName: fullNameInput,
    email: emailInput,
    phone: phoneInput
  };

  const defaultRateText = getRoomRateText(room);

  function clearFeedback() {
    feedback.textContent = "";
    feedback.removeAttribute("data-state");
  }

  function setFeedback(message) {
    feedback.textContent = message;
    feedback.dataset.state = "error";
  }

  function clearInvalidState() {
    Object.values(fieldMap).forEach((field) => {
      field.removeAttribute("aria-invalid");
      const errorDiv = document.getElementById(`eekos-error-${field.name}`);
      if (errorDiv) {
        errorDiv.textContent = "";
      }
    });
  }

  function markInvalid(fieldKey, message) {
    clearInvalidState();

    const field = fieldMap[fieldKey];

    if (!field) {
      return;
    }

    field.setAttribute("aria-invalid", "true");
    
    const errorDiv = document.getElementById(`eekos-error-${field.name}`);
    if (errorDiv && message) {
      errorDiv.textContent = message;
    }
    
    field.focus({ preventScroll: true });
    field.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function setPaymentUiState() {
    submitButton.disabled = false;
    submitButton.classList.remove("is-disabled");
    submitButton.setAttribute("aria-disabled", "false");

    bookingNote.textContent = "Your reservation request is saved first. The room is only secured after successful payment on the secure checkout page.";
    bookingNote.classList.remove("is-warning");
  }

  function updateSummary() {
    const financials = getBookingPreviewFinancials({
      room,
      checkin: checkinInput.value,
      checkout: checkoutInput.value,
      paymentConfig: PAYMENT_CONFIG
    });

    summaryGuests.textContent = buildGuestSummary(adultsInput.value, childrenInput.value);
    summaryDates.textContent = checkinInput.value && checkoutInput.value
      ? `${formatDateValue(checkinInput.value)} - ${formatDateValue(checkoutInput.value)}`
      : "Select dates";
    summaryNights.textContent = financials.nights
      ? `${financials.nights} ${financials.nights === 1 ? "night" : "nights"}`
      : "-";

    if (financials.rate > 0) {
      summaryRate.textContent = `${formatCurrency(financials.rate, PAYMENT_CONFIG.currency)} / night`;
      summaryTotal.textContent = formatCurrency(financials.total, PAYMENT_CONFIG.currency);
      summaryDeposit.textContent = formatCurrency(financials.deposit, PAYMENT_CONFIG.currency);
      summaryBalance.textContent = formatCurrency(financials.balance, PAYMENT_CONFIG.currency);
      summaryPriceState.textContent = financials.rateSource === "live"
        ? "Estimated total for selected dates"
        : "Estimated from public rate guide";
      summaryPriceCopy.textContent = financials.rateSource === "live"
        ? "This estimate helps guests review cost before payment. Final checkout still shows amount before payment completes."
        : "This estimate uses the public rate guide for the selected dates. Final checkout still confirms the exact payable amount before payment.";
      return;
    }

    summaryRate.textContent = defaultRateText;
    summaryTotal.textContent = "Shown on payment page";
    summaryDeposit.textContent = "Shown on payment page";
    summaryBalance.textContent = "Shown on payment page";
    summaryPriceState.textContent = "Starting rate guide";
    summaryPriceCopy.textContent = "This room uses public guide rates only. Final amount is confirmed on secure checkout before payment.";
  }

  function prefillFromDraft() {
    const draft = loadBookingDraft();

    if (!draft || draft.roomId !== room.id) {
      return;
    }

    checkinInput.value = draft.checkin || "";
    checkoutInput.value = draft.checkout || "";
    adultsInput.value = draft.adults || "2";
    childrenInput.value = draft.children || "0";
    fullNameInput.value = draft.fullName || "";
    emailInput.value = draft.email || "";
    phoneInput.value = draft.phone || "";
    arrivalInput.value = draft.arrivalTime || "";
    specialRequestsInput.value = draft.specialRequests || "";
  }

  syncDateInputMinimums(checkinInput, checkoutInput);
  prefillFromDraft();
  syncDateInputMinimums(checkinInput, checkoutInput);
  setPaymentUiState();
  updateSummary();

  [checkinInput, checkoutInput, adultsInput, childrenInput].forEach((field) => {
    field.addEventListener("input", () => {
      clearInvalidState();
      clearFeedback();
      updateSummary();
    });
    field.addEventListener("change", () => {
      if (field === checkinInput) {
        syncDateInputMinimums(checkinInput, checkoutInput);
      }

      clearInvalidState();
      clearFeedback();
      updateSummary();
    });
  });

  [fullNameInput, emailInput, phoneInput, arrivalInput, specialRequestsInput].forEach((field) => {
    field.addEventListener("input", () => {
      clearInvalidState();
      clearFeedback();
    });
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    clearFeedback();

    const stayValidation = validateStayDetails({
      checkin: checkinInput.value,
      checkout: checkoutInput.value
    });

    if (!stayValidation.valid) {
      if (stayValidation.field && fieldMap[stayValidation.field]) {
        markInvalid(stayValidation.field, stayValidation.message);
      } else {
        setFeedback(stayValidation.message);
      }
      return;
    }

    const guestValidation = validateGuestDetails({
      fullName: fullNameInput.value,
      email: emailInput.value,
      phone: phoneInput.value
    });

    if (!guestValidation.valid) {
      if (guestValidation.field && fieldMap[guestValidation.field]) {
        markInvalid(guestValidation.field, guestValidation.message);
      } else {
        setFeedback(guestValidation.message);
      }
      return;
    }

    const financials = getBookingPreviewFinancials({
      room,
      checkin: checkinInput.value,
      checkout: checkoutInput.value,
      paymentConfig: PAYMENT_CONFIG
    });
    const reference = createBookingReference();

    const saved = saveBookingDraft({
      roomId: room.id,
      roomName: room.name,
      checkin: checkinInput.value,
      checkout: checkoutInput.value,
      adults: adultsInput.value || "2",
      children: childrenInput.value || "0",
      fullName: fullNameInput.value.trim(),
      email: emailInput.value.trim(),
      phone: phoneInput.value.trim(),
      arrivalTime: arrivalInput.value.trim(),
      specialRequests: specialRequestsInput.value.trim(),
      nights: financials.nights,
      rate: financials.rate,
      total: financials.total,
      deposit: financials.deposit,
      balance: financials.balance,
      pricingSource: financials.rateSource,
      reference,
      currency: PAYMENT_CONFIG.currency,
      createdAt: new Date().toISOString()
    });

    if (!saved) {
      setFeedback("Unable to prepare payment review in this browser session. Please retry or use a different browser.");
      return;
    }

    window.location.assign("./payment.html");
  });
}

if (typeof document !== "undefined") {
  mountBookingPage();
}
