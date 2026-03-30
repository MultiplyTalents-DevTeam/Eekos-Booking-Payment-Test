import { INQUIRE_URL, PAYMENT_CONFIG, ROOM_PRICING_TEXT } from "./config.js";
import { ROOM_DATA } from "./data/rooms.js";
import { escapeAttribute, escapeHtml } from "./lib/escape.js";
import { formatCurrency, getRoomDisplayRate, getRoomStartingRate } from "./lib/booking.js";

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

function renderGalleryThumbs(room) {
  const images = (room.images || []).filter(Boolean);

  return images.slice(0, 6).map((image, index) => `
    <button
      type="button"
      class="eekos-room-page-thumb ${index === 0 ? "is-active" : ""}"
      data-room-page-image="${escapeAttribute(image)}"
      data-room-page-index="${index}"
      aria-label="Show ${escapeAttribute(room.name)} image ${index + 1}"
    >
      <img src="${escapeAttribute(image)}" alt="${escapeAttribute(room.name)} thumbnail ${index + 1}">
    </button>
  `).join("");
}

function renderRoomPage(room) {
  const displayRate = getRoomDisplayRate(room);
  const hasLiveRate = getRoomStartingRate(room) > 0;
  const rateText = displayRate
    ? `From ${formatCurrency(displayRate, PAYMENT_CONFIG.currency)} / night`
    : ROOM_PRICING_TEXT.cardRateUnavailable;
  const images = (room.images || []).filter(Boolean);
  const mainImage = images[0] || "";

  return `
    <section class="eekos-room-page" aria-label="Room details">
      <div class="eekos-room-page-layout">
        <div class="eekos-room-page-media">
          <div class="eekos-room-page-hero-top">
            <a class="eekos-room-page-back" href="./index.html#eekos-room-selector">Back to all rooms</a>
          </div>
          <img
            id="eekos-room-page-main-image"
            class="eekos-room-page-main-image"
            src="${escapeAttribute(mainImage)}"
            alt="${escapeAttribute(room.name)} main image"
          >
          <div class="eekos-room-page-thumbs" id="eekos-room-page-thumbs">
            ${renderGalleryThumbs(room)}
          </div>
        </div>

        <div class="eekos-room-page-content">
          <section class="eekos-room-page-overview" aria-label="Room overview">
            <div class="eekos-room-page-overview-main">
              <p class="eekos-room-page-eyebrow">${escapeHtml(room.typeLabel)}</p>
              <h1 class="eekos-room-page-title">${escapeHtml(room.name)}</h1>
              <p class="eekos-room-page-description">${escapeHtml(room.description)}</p>
            </div>

            <div class="eekos-room-page-overview-rate">
              <p class="eekos-room-page-rate">${escapeHtml(rateText)}</p>
              <p class="eekos-room-page-rate-note">${escapeHtml(hasLiveRate ? ROOM_PRICING_TEXT.cardLiveRateNote : ROOM_PRICING_TEXT.cardRateNote)}</p>
            </div>
          </section>

          <ul class="eekos-room-page-specs">
            <li>${escapeHtml(room.guestBand === "5+" ? "5+ guests" : `${room.guestBand} guests`)}</li>
            <li>${escapeHtml(room.beds)}</li>
            <li>${escapeHtml(String(room.size))} sq m</li>
          </ul>

          <section class="eekos-room-page-booking-band" aria-label="Booking actions">
            <div class="eekos-room-page-booking-band-copy">
              <p class="eekos-room-page-card-kicker">Book this room</p>
              <p class="eekos-room-page-card-rate">${escapeHtml(rateText)}</p>
              <p class="eekos-room-page-card-copy">
                Final amount and any deposit request are shown before payment. Reservations are confirmed after successful checkout.
              </p>
            </div>

            <ul class="eekos-room-page-card-list">
              <li><span>Guests</span><strong>${escapeHtml(room.guestBand === "5+" ? "5+" : room.guestBand)}</strong></li>
              <li><span>Bed setup</span><strong>${escapeHtml(room.beds)}</strong></li>
              <li><span>Room size</span><strong>${escapeHtml(String(room.size))} sq m</strong></li>
            </ul>

            <div class="eekos-room-page-actions">
              <a class="eekos-room-page-btn eekos-room-page-btn--primary" href="./booking.html?room=${encodeURIComponent(room.id)}">Check dates &amp; price</a>
              <a class="eekos-room-page-btn eekos-room-page-btn--secondary" href="${escapeAttribute(resolveInquireUrl())}">Inquire</a>
            </div>
          </section>

          <div class="eekos-room-page-sections">
            <section class="eekos-room-page-section">
              <p class="eekos-room-page-details-title">Room highlights</p>
              <div class="eekos-room-page-tags">
                ${(room.tags || []).map((tag) => `<span class="eekos-room-page-tag">${escapeHtml(tag)}</span>`).join("")}
              </div>
            </section>

            <section class="eekos-room-page-section eekos-room-page-section--amenities">
              <p class="eekos-room-page-details-title">Amenities</p>
              <ul class="eekos-room-page-details-list">
                ${(room.details || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
              </ul>
            </section>

            <section class="eekos-room-page-section eekos-room-page-section--notes">
              <p class="eekos-room-page-details-title">Stay notes</p>
              <ul class="eekos-room-page-notes-list">
                <li>Rates shown on the website are guide rates and may vary by date and room plan.</li>
                <li>Guests review the final amount before payment on secure checkout.</li>
                <li>Payment confirmation is what secures the reservation.</li>
              </ul>
            </section>
          </div>
        </div>
      </div>
    </section>
  `;
}

function mountRoomPage() {
  const root = document.getElementById("room-page-app");

  if (!root) {
    return;
  }

  const room = getRoomFromQuery();

  if (!room) {
    root.innerHTML = `
      <section class="eekos-room-page-empty">
        <h1>Room not found</h1>
        <p>Return to the room list and choose a room again.</p>
        <a class="eekos-room-page-btn eekos-room-page-btn--primary" href="./index.html#eekos-room-selector">Back to rooms</a>
      </section>
    `;
    return;
  }

  root.innerHTML = renderRoomPage(room);

  const thumbs = root.querySelector("#eekos-room-page-thumbs");
  const mainImage = root.querySelector("#eekos-room-page-main-image");

  if (!thumbs || !mainImage) {
    return;
  }

  thumbs.addEventListener("click", (event) => {
    const button = event.target.closest("[data-room-page-image]");

    if (!button) {
      return;
    }

    const nextImage = button.getAttribute("data-room-page-image") || "";
    const nextIndex = Number(button.getAttribute("data-room-page-index") || 0);

    mainImage.src = nextImage;
    mainImage.alt = `${room.name} image ${nextIndex + 1}`;

    thumbs.querySelectorAll(".eekos-room-page-thumb").forEach((thumb) => {
      thumb.classList.remove("is-active");
    });

    button.classList.add("is-active");
  });
}

if (typeof document !== "undefined") {
  mountRoomPage();
}
