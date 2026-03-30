import { ROOM_PRICING_TEXT } from "../config.js";
import { formatCurrency, getRoomDisplayRate, getRoomStartingRate } from "../lib/booking.js";
import { escapeAttribute, escapeHtml } from "../lib/escape.js";

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

function renderRoomCard(room, inquireUrl) {
  const mainImage = (room.images || []).find(Boolean) || "";
  const hasLiveRate = getRoomStartingRate(room) > 0;
  const roomDetailUrl = `./room.html?room=${encodeURIComponent(room.id)}`;

  return `
    <a
      class="eekos-room-teaser"
      aria-label="${escapeAttribute(room.name)}"
      href="${escapeAttribute(roomDetailUrl)}"
      data-inquire-url="${escapeAttribute(inquireUrl)}"
    >
      <div class="eekos-room-teaser-media">
        <img
          src="${escapeAttribute(mainImage)}"
          alt="${escapeAttribute(room.name)}"
          class="eekos-room-teaser-image"
          loading="lazy"
        >
        <span class="eekos-room-teaser-badge">${escapeHtml(room.typeLabel)}</span>
      </div>

      <div class="eekos-room-teaser-content">
        <h3 class="eekos-room-teaser-title">${escapeHtml(room.name)}</h3>
        <p class="eekos-room-teaser-meta">
          ${escapeHtml(renderGuestBand(room.guestBand))} - ${escapeHtml(room.beds)}
        </p>
        <p class="eekos-room-teaser-price">${renderRoomRateTitle(room)}</p>
        <p class="eekos-room-teaser-note">
          ${escapeHtml(hasLiveRate ? ROOM_PRICING_TEXT.cardLiveRateNote : ROOM_PRICING_TEXT.cardRateNote)}
        </p>
        <div class="eekos-room-teaser-foot">
          <span>View full room details</span>
          <span aria-hidden="true">&gt;</span>
        </div>
      </div>
    </a>
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

