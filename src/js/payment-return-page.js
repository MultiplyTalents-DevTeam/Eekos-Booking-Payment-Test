import { loadBookingDraft } from "./lib/booking-draft.js";
import { escapeHtml } from "./lib/escape.js";

function resolveMode() {
  return document.body?.dataset?.paymentReturn === "success" ? "success" : "cancelled";
}

function renderPage(mode, draft, params) {
  const reference = params.get("reference") || draft?.reference || "-";
  const roomName = draft?.roomName || "your stay";
  const title = mode === "success" ? "Payment received" : "Payment not completed";
  const copy = mode === "success"
    ? "Your deposit was received on secure checkout. EEKOS will verify the payment and finalize the reservation in the master calendar."
    : "Your booking request is still on file, but the room is not reserved yet because payment was not completed.";
  const helper = mode === "success"
    ? "Keep your reservation reference for any follow-up questions while confirmation is being finalized."
    : "You can return to the payment review page to try again, or contact EEKOS if you want to pay later at the property.";
  const primaryLabel = mode === "success" ? "Back to room selection" : "Return to payment review";
  const primaryHref = mode === "success" ? "../index.html#eekos-room-selector" : "../payment.html";
  const secondaryLabel = mode === "success" ? "View room details" : "Back to room selection";
  const secondaryHref = mode === "success" && draft?.roomId
    ? `../room.html?room=${encodeURIComponent(draft.roomId)}`
    : "../index.html#eekos-room-selector";

  return `
    <section id="eekos-room-selector" class="eekos-payment-page-root">
      <div class="eekos-payment-page-shell">
        <header class="eekos-booking-page-header">
          <a class="eekos-booking-page-back" href="../index.html#eekos-room-selector">Back to room selection</a>
        </header>

        <div class="eekos-payment-return-card">
          <p class="eekos-booking-kicker">${mode === "success" ? "Secure checkout" : "Reservation request"}</p>
          <h1 class="eekos-booking-title">${title}</h1>
          <p class="eekos-section-copy">${copy}</p>

          <div class="eekos-payment-return-summary">
            <div>
              <span>Reservation reference</span>
              <strong>${escapeHtml(reference)}</strong>
            </div>
            <div>
              <span>Stay</span>
              <strong>${escapeHtml(roomName)}</strong>
            </div>
          </div>

          <p class="eekos-micro">${helper}</p>

          <div class="eekos-form-actions eekos-form-actions--spacious">
            <a class="eekos-btn eekos-btn--ghost" href="${secondaryHref}">${secondaryLabel}</a>
            <a class="eekos-btn eekos-btn--primary" href="${primaryHref}">${primaryLabel}</a>
          </div>
        </div>
      </div>
    </section>
  `;
}

function mountPaymentReturnPage() {
  const root = document.getElementById("payment-return-page-app");

  if (!root) {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const draft = loadBookingDraft();
  const mode = resolveMode();

  root.innerHTML = renderPage(mode, draft, params);
}

if (typeof document !== "undefined") {
  mountPaymentReturnPage();
}
