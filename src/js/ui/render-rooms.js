import { ROOM_PRICING_TEXT } from "../config.js";
import { formatCurrency, getRoomDisplayRate, getRoomStartingRate } from "../lib/booking.js";
import { escapeAttribute, escapeHtml } from "../lib/escape.js";

function renderMedia(room) {
  const validImages = (room.images || []).filter(Boolean);
  const mainImage = validImages[0] || "";
  const thumbnails = validImages.length > 1
    ? `
      <div class="eekos-room-thumbs">
        ${validImages.slice(0, 4).map((image, index) => `
          <button
            type="button"
            class="eekos-room-thumb ${index === 0 ? "is-active" : ""}"
            data-room-id="${escapeAttribute(room.id)}"
            data-image="${escapeAttribute(image)}"
            aria-label="Show ${escapeAttribute(room.name)} image ${index + 1}"
          >
            <img src="${escapeAttribute(image)}" alt="${escapeAttribute(room.name)} thumbnail ${index + 1}">
          </button>
        `).join("")}
      </div>
    `
    : "";

  return `
    <img
      src="${escapeAttribute(mainImage)}"
      alt="${escapeAttribute(room.name)}"
      class="eekos-room-main-image"
      data-room-main="${escapeAttribute(room.id)}"
    >
    ${thumbnails}
  `;
}

function renderGuestBand(guestBand) {
  return guestBand === "5+" ? "5+ guests" : `${guestBand} guests`;
}

function renderRoomRateTitle(room) {
  const displayRate = getRoomDisplayRate(room);

  if (!displayRate) {
    return escapeHtml(ROOM_PRICING_TEXT.cardRateUnavailable);
  }

  return `${escapeHtml(formatCurrency(displayRate))} <span class="eekos-room-price-suffix">/ night</span>`;
}

function renderCardStayNotes() {
  return ROOM_PRICING_TEXT.cardStayNotes.map((item) => `
    <div class="eekos-room-rate">
      <strong>${escapeHtml(item.title)}</strong>
      <span>${escapeHtml(item.body)}</span>
    </div>
  `).join("");
}

function renderRoomCard(room, inquireUrl) {
  const hasDisplayRate = getRoomDisplayRate(room) > 0;
  const hasLiveRate = getRoomStartingRate(room) > 0;

  return `
    <article class="eekos-room-card" aria-label="${escapeAttribute(room.name)}">
      <div class="eekos-room-media">
        ${renderMedia(room)}
      </div>

      <div class="eekos-room-content">
        <p class="eekos-room-eyebrow">${escapeHtml(room.typeLabel)}</p>
        <h3 class="eekos-room-title">${escapeHtml(room.name)}</h3>

        <ul class="eekos-room-specs" aria-label="${escapeAttribute(room.name)} specifications">
          <li>${escapeHtml(renderGuestBand(room.guestBand))}</li>
          <li>${escapeHtml(room.beds)}</li>
          <li>${escapeHtml(String(room.size))} sq m</li>
        </ul>

        <p class="eekos-room-description">${escapeHtml(room.description)}</p>

        <div class="eekos-room-tags">
          ${(room.tags || []).map((tag) => `<span class="eekos-room-tag">${escapeHtml(tag)}</span>`).join("")}
        </div>

        <div class="eekos-room-details">
          <p class="eekos-room-details-title">Room details</p>
          <ul class="eekos-room-details-list">
            ${(room.details || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ul>
        </div>
      </div>

      <div class="eekos-room-cta">
        <div>
          <div class="eekos-room-price-panel">
            <p class="eekos-room-price-label">${escapeHtml(hasDisplayRate ? ROOM_PRICING_TEXT.cardPriceLabel : ROOM_PRICING_TEXT.cardFallbackLabel)}</p>
            <h4 class="eekos-room-price-title">${renderRoomRateTitle(room)}</h4>
            <p class="eekos-room-price-note">
              ${escapeHtml(hasLiveRate ? ROOM_PRICING_TEXT.cardLiveRateNote : ROOM_PRICING_TEXT.cardRateNote)}
            </p>
          </div>

          <div class="eekos-room-rate-list">
            ${renderCardStayNotes()}
          </div>
        </div>

        <div class="eekos-room-actions">
          <button type="button" class="eekos-btn eekos-btn--primary" data-open-booking="${escapeAttribute(room.id)}">Check dates &amp; price</button>
          <a class="eekos-btn eekos-btn--secondary" href="${escapeAttribute(inquireUrl)}">Inquire</a>
        </div>
      </div>
    </article>
  `;
}

export function renderRoomCards(rooms, inquireUrl) {
  if (!rooms.length) {
    return `
      <div class="eekos-empty">
        No rooms match the current filter. Try a different guest group or turn off the balcony filter.
      </div>
    `;
  }

  return rooms.map((room) => renderRoomCard(room, inquireUrl)).join("");
}

