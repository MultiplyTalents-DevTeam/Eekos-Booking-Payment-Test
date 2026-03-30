import { BOOKING_UI_TEXT, INQUIRE_URL, PAYMENT_CONFIG, ROOM_PRICING_TEXT } from "./config.js";
import { ROOM_DATA } from "./data/rooms.js";
import {
  buildGuestSummary,
  formatCurrency,
  formatDateValue,
  getBookingFinancials,
  getRoomDisplayRate,
  getRoomStartingRate,
  getRoomReferenceRate
} from "./lib/booking.js";
import {
  buildPaymentHandoffUrl,
  createBookingReference,
  hasLivePaymentUrl
} from "./lib/payment.js";
import { getFilteredRooms } from "./lib/room-filters.js";
import { syncDateInputMinimums, validateGuestDetails, validateStayDetails } from "./lib/validation.js";
import { renderRoomCards } from "./ui/render-rooms.js";

const MODAL_FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])"
].join(", ");

function queryWithin(container, selector) {
  const node = container.querySelector(selector);

  if (!node) {
    throw new Error(`Missing selector: ${selector}`);
  }

  return node;
}

function isVisible(node) {
  return !node.hasAttribute("hidden") && node.getClientRects().length > 0;
}

export function initializeRoomSelector(root = document) {
  const component = root.querySelector("#eekos-room-selector");

  if (!component || component.dataset.eekosMounted === "true") {
    return;
  }

  component.dataset.eekosMounted = "true";

  const roomList = queryWithin(component, "#eekos-room-list");
  const roomCount = queryWithin(component, "#eekos-room-count");
  const roomNote = queryWithin(component, "#eekos-room-note");
  const featureButton = queryWithin(component, "[data-feature='balcony']");
  const guestButtons = component.querySelectorAll("[data-guests]");
  const sortButtons = component.querySelectorAll("[data-sort]");

  const roomDetailModal = queryWithin(component, "#eekos-room-detail-modal");
  const roomDetailClose = queryWithin(component, "#eekos-room-detail-close");
  const roomDetailTitle = queryWithin(component, "#eekos-room-detail-title");
  const roomDetailEyebrow = queryWithin(component, "#eekos-room-detail-eyebrow");
  const roomDetailPrice = queryWithin(component, "#eekos-room-detail-price");
  const roomDetailDescription = queryWithin(component, "#eekos-room-detail-description");
  const roomDetailSpecs = queryWithin(component, "#eekos-room-detail-specs");
  const roomDetailTags = queryWithin(component, "#eekos-room-detail-tags");
  const roomDetailAmenities = queryWithin(component, "#eekos-room-detail-amenities");
  const roomDetailMainImage = queryWithin(component, "#eekos-room-detail-main-image");
  const roomDetailThumbs = queryWithin(component, "#eekos-room-detail-thumbs");
  const roomDetailBook = queryWithin(component, "#eekos-room-detail-book");
  const roomDetailInquire = queryWithin(component, "#eekos-room-detail-inquire");

  const modal = queryWithin(component, "#eekos-booking-modal");
  const modalClose = queryWithin(component, "#eekos-modal-close");
  const bookingForm = queryWithin(component, "#eekos-booking-form");
  const confirmationBox = queryWithin(component, "#eekos-confirmation");
  const closeConfirmation = queryWithin(component, "#eekos-close-confirmation");
  const feedback = queryWithin(component, "#eekos-form-feedback");
  const paymentNote = queryWithin(component, "#eekos-payment-note");
  const submitButton = queryWithin(component, "#eekos-submit-booking");
  const paymentStepTitle = queryWithin(component, "#eekos-payment-step-title");
  const paymentStepCopy = queryWithin(component, "#eekos-payment-step-copy");
  const paymentStateKicker = queryWithin(component, "#eekos-payment-state-kicker");

  const checkinInput = queryWithin(component, "#eekos-checkin");
  const checkoutInput = queryWithin(component, "#eekos-checkout");
  const adultsInput = queryWithin(component, "#eekos-adults");
  const childrenInput = queryWithin(component, "#eekos-children");
  const fullNameInput = queryWithin(component, "#eekos-full-name");
  const emailInput = queryWithin(component, "#eekos-email");
  const phoneInput = queryWithin(component, "#eekos-phone");
  const arrivalInput = queryWithin(component, "#eekos-arrival-time");
  const specialRequestsInput = queryWithin(component, "#eekos-special-requests");

  const summaryRoomName = queryWithin(component, "#eekos-summary-room-name");
  const summaryGuests = queryWithin(component, "#eekos-summary-guests");
  const summaryDates = queryWithin(component, "#eekos-summary-dates");
  const summaryNights = queryWithin(component, "#eekos-summary-nights");
  const summarySize = queryWithin(component, "#eekos-summary-size");
  const summaryBed = queryWithin(component, "#eekos-summary-bed");
  const summaryCardTitle = queryWithin(component, "#eekos-summary-card-title");
  const summaryRateState = queryWithin(component, "#eekos-summary-rate-state");
  const summaryRateCopy = queryWithin(component, "#eekos-summary-rate-copy");
  const summaryRateLabel = queryWithin(component, "#eekos-summary-rate-label");
  const summaryRatePreview = queryWithin(component, "#eekos-summary-rate-preview");
  const summaryTotalRow = queryWithin(component, "#eekos-summary-total-row");
  const summaryTotal = queryWithin(component, "#eekos-summary-total");
  const summaryDepositRow = queryWithin(component, "#eekos-summary-deposit-row");
  const summaryDeposit = queryWithin(component, "#eekos-summary-deposit");
  const summaryBalanceRow = queryWithin(component, "#eekos-summary-balance-row");
  const summaryBalance = queryWithin(component, "#eekos-summary-balance");
  const paymentAmount = queryWithin(component, "#eekos-payment-amount");
  const paymentCopy = queryWithin(component, "#eekos-payment-copy");
  const confirmationRef = queryWithin(component, "#eekos-confirmation-ref");
  const confirmationText = queryWithin(component, "#eekos-confirmation-text");

  const fieldMap = {
    checkin: checkinInput,
    checkout: checkoutInput,
    fullName: fullNameInput,
    email: emailInput,
    phone: phoneInput
  };

  const state = {
    guests: "all",
    sort: "default",
    balconyOnly: false
  };

  const roomLookup = new Map(ROOM_DATA.map((room) => [room.id, room]));

  let activeRoom = null;
  let activeDetailRoom = null;
  let activeStep = 1;
  let lastFocusedTrigger = null;
  let lastDetailFocusedTrigger = null;
  let bodyOverflowBeforeModal = "";

  function isPaymentReady() {
    return hasLivePaymentUrl(PAYMENT_CONFIG.paymentUrl);
  }

  function getFocusableElementsWithin(container) {
    return Array.from(container.querySelectorAll(MODAL_FOCUSABLE_SELECTOR)).filter(
      (node) => !node.disabled && isVisible(node)
    );
  }

  function focusField(fieldKey) {
    const field = fieldMap[fieldKey];

    if (!field) {
      return;
    }

    requestAnimationFrame(() => {
      field.focus({ preventScroll: true });
      field.scrollIntoView({ block: "center", behavior: "smooth" });
    });
  }

  function getStepFocusTarget(step) {
    if (step === 1) {
      return checkinInput;
    }

    if (step === 2) {
      return paymentStepTitle;
    }

    return fullNameInput;
  }

  function clearInvalidStates() {
    Object.values(fieldMap).forEach((field) => {
      field.removeAttribute("aria-invalid");
      const errorDiv = document.getElementById(`eekos-error-${field.name}`);
      if (errorDiv) {
        errorDiv.textContent = "";
      }
    });
  }

  function clearFeedback() {
    feedback.textContent = "";
    feedback.removeAttribute("data-state");
  }

  function setFeedback(message) {
    feedback.textContent = message;
    feedback.dataset.state = "error";
  }

  function markInvalidField(fieldKey, message) {
    clearInvalidStates();

    if (!fieldKey) {
      return;
    }

    const field = fieldMap[fieldKey];

    if (!field) {
      return;
    }

    field.setAttribute("aria-invalid", "true");
    
    const errorDiv = document.getElementById(`eekos-error-${field.name}`);
    if (errorDiv && message) {
      errorDiv.textContent = message;
    }
    
    focusField(fieldKey);
  }

  function syncStepIndicators(step) {
    component.querySelectorAll("[data-step-indicator]").forEach((item) => {
      const isActive = Number(item.getAttribute("data-step-indicator")) === step;

      item.classList.toggle("is-active", isActive);

      if (isActive) {
        item.setAttribute("aria-current", "step");
      } else {
        item.removeAttribute("aria-current");
      }
    });
  }

  function syncStepPanes(step) {
    component.querySelectorAll("[data-step-pane]").forEach((item) => {
      item.classList.toggle("is-active", Number(item.getAttribute("data-step-pane")) === step);
    });
  }

  function scrollModalToTop() {
    if (typeof modal.scrollTo === "function") {
      modal.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    modal.scrollTop = 0;
  }

  function setStep(step) {
    activeStep = step;
    syncStepIndicators(step);
    syncStepPanes(step);
    clearFeedback();

    requestAnimationFrame(() => {
      const focusTarget = getStepFocusTarget(step);

      if (focusTarget && !modal.hidden) {
        focusTarget.focus({ preventScroll: true });
      }
    });
  }

  function updatePaymentUiState() {
    const paymentReady = isPaymentReady();

    submitButton.textContent = paymentReady
      ? BOOKING_UI_TEXT.paymentReadyButtonLabel
      : BOOKING_UI_TEXT.paymentMissingButtonLabel;
    submitButton.disabled = !paymentReady;
    submitButton.classList.toggle("is-disabled", !paymentReady);
    submitButton.setAttribute("aria-disabled", String(!paymentReady));

    paymentNote.textContent = paymentReady
      ? BOOKING_UI_TEXT.paymentReadyNote
      : BOOKING_UI_TEXT.paymentMissingNote;
    paymentNote.classList.toggle("is-warning", !paymentReady);
  }

  function updatePaymentCopyForConfig() {
    confirmationText.textContent = isPaymentReady()
      ? BOOKING_UI_TEXT.paymentReadyConfirmation
      : BOOKING_UI_TEXT.paymentMissingConfirmation;
  }

  function setLivePricingRowsVisible(isVisible) {
    summaryTotalRow.hidden = !isVisible;
    summaryDepositRow.hidden = !isVisible;
    summaryBalanceRow.hidden = !isVisible;
  }

  function buildDetailRateText(room) {
    const displayRate = getRoomDisplayRate(room);

    if (!displayRate) {
      return ROOM_PRICING_TEXT.cardRateUnavailable;
    }

    return `From ${formatCurrency(displayRate, PAYMENT_CONFIG.currency)} / night`;
  }

  function setDetailMainImage(imageUrl, roomName, imageIndex) {
    roomDetailMainImage.src = imageUrl || "";
    roomDetailMainImage.alt = `${roomName} image ${imageIndex + 1}`;
  }

  function renderRoomDetail(room) {
    const images = (room.images || []).filter(Boolean);
    const specs = [
      room.guestBand === "5+" ? "5+ guests" : `${room.guestBand} guests`,
      room.beds,
      `${room.size} sq m`
    ];

    roomDetailEyebrow.textContent = room.typeLabel;
    roomDetailTitle.textContent = room.name;
    roomDetailPrice.textContent = buildDetailRateText(room);
    roomDetailDescription.textContent = room.description;
    roomDetailInquire.setAttribute("href", INQUIRE_URL);

    roomDetailSpecs.innerHTML = specs.map((item) => `<li>${item}</li>`).join("");
    roomDetailTags.innerHTML = (room.tags || [])
      .map((tag) => `<span class="eekos-room-tag">${tag}</span>`)
      .join("");
    roomDetailAmenities.innerHTML = (room.details || [])
      .map((item) => `<li>${item}</li>`)
      .join("");

    if (!images.length) {
      roomDetailMainImage.src = "";
      roomDetailMainImage.alt = `${room.name} preview`;
      roomDetailThumbs.innerHTML = "";
      return;
    }

    setDetailMainImage(images[0], room.name, 0);
    roomDetailThumbs.innerHTML = images.slice(0, 6).map((image, index) => `
      <button
        type="button"
        class="eekos-room-thumb ${index === 0 ? "is-active" : ""}"
        data-detail-image="${image}"
        data-detail-index="${index}"
        aria-label="Show ${room.name} image ${index + 1}"
      >
        <img src="${image}" alt="${room.name} thumbnail ${index + 1}">
      </button>
    `).join("");
  }

  function openRoomDetail(room, trigger) {
    activeDetailRoom = room;
    lastDetailFocusedTrigger = trigger || document.activeElement;
    bodyOverflowBeforeModal = document.body.style.overflow;

    renderRoomDetail(room);
    roomDetailModal.hidden = false;
    document.body.style.overflow = "hidden";

    // Allow browser a frame to apply 'hidden = false' before adding animation class
    requestAnimationFrame(() => {
      roomDetailModal.classList.add("is-open");
      roomDetailTitle.focus({ preventScroll: true });
    });
  }

  function closeRoomDetail(restoreFocus = true) {
    roomDetailModal.classList.remove("is-open");

    // Wait for transition before hiding
    setTimeout(() => {
      if (!roomDetailModal.classList.contains("is-open")) {
        roomDetailModal.hidden = true;
      }
    }, 300);

    activeDetailRoom = null;
    document.body.style.overflow = bodyOverflowBeforeModal;

    if (restoreFocus && lastDetailFocusedTrigger && typeof lastDetailFocusedTrigger.focus === "function") {
      lastDetailFocusedTrigger.focus();
    }
  }

  function updateSummary() {
    if (!activeRoom) {
      return;
    }

    const financials = getBookingFinancials({
      room: activeRoom,
      checkin: checkinInput.value,
      checkout: checkoutInput.value,
      paymentConfig: PAYMENT_CONFIG
    });
    const referenceRate = getRoomReferenceRate(activeRoom);
    const paymentReady = isPaymentReady();
    const referenceRateText = referenceRate > 0
      ? `From ${formatCurrency(referenceRate, PAYMENT_CONFIG.currency)} / night`
      : "Inquire for direct pricing";

    summaryRoomName.textContent = activeRoom.name;
    summaryGuests.textContent = buildGuestSummary(adultsInput.value, childrenInput.value);
    summaryDates.textContent = checkinInput.value && checkoutInput.value
      ? `${formatDateValue(checkinInput.value)} - ${formatDateValue(checkoutInput.value)}`
      : "Select dates";
    summaryNights.textContent = financials.nights
      ? `${financials.nights} ${financials.nights === 1 ? "night" : "nights"}`
      : "-";
    summarySize.textContent = `${activeRoom.size} sq m`;
    summaryBed.textContent = activeRoom.beds;

    if (financials.rate > 0) {
      setLivePricingRowsVisible(true);
      summaryCardTitle.textContent = ROOM_PRICING_TEXT.summaryLiveTitle;
      summaryRateState.textContent = ROOM_PRICING_TEXT.summaryLiveState;
      summaryRateCopy.textContent = ROOM_PRICING_TEXT.summaryLiveCardCopy;
      summaryRateLabel.textContent = "Nightly rate";
      summaryRatePreview.textContent = `${formatCurrency(financials.rate, PAYMENT_CONFIG.currency)} / night`;
      summaryTotal.textContent = formatCurrency(financials.total, PAYMENT_CONFIG.currency);
      summaryDeposit.textContent = formatCurrency(financials.deposit, PAYMENT_CONFIG.currency);
      summaryBalance.textContent = formatCurrency(financials.balance, PAYMENT_CONFIG.currency);
      paymentStepTitle.textContent = ROOM_PRICING_TEXT.paymentStepTitleLive;
      paymentStepCopy.textContent = ROOM_PRICING_TEXT.paymentStepCopyLive;
      paymentStateKicker.textContent = ROOM_PRICING_TEXT.paymentStateKickerLive;
      paymentAmount.textContent = formatCurrency(financials.total, PAYMENT_CONFIG.currency);
      paymentCopy.textContent = paymentReady
        ? "Guests should review the estimated stay total, deposit due today, and remaining balance before choosing how to pay."
        : "This is an estimate only. Add the real hosted payment link before using this flow in production.";
      return;
    }

    setLivePricingRowsVisible(false);
    summaryCardTitle.textContent = ROOM_PRICING_TEXT.summaryReferenceTitle;
    summaryRateLabel.textContent = ROOM_PRICING_TEXT.summaryReferenceRateLabel;

    if (referenceRate > 0) {
      summaryRatePreview.textContent = referenceRateText;
      summaryRateState.textContent = paymentReady
        ? ROOM_PRICING_TEXT.summaryReferenceStateReady
        : ROOM_PRICING_TEXT.summaryReferenceStateMissing;
      summaryRateCopy.textContent = paymentReady
        ? ROOM_PRICING_TEXT.summaryReferenceCardCopyReady
        : ROOM_PRICING_TEXT.summaryReferenceCardCopyMissing;
      paymentStepTitle.textContent = paymentReady
        ? ROOM_PRICING_TEXT.paymentStepTitleReferenceReady
        : ROOM_PRICING_TEXT.paymentStepTitleReferenceMissing;
      paymentStepCopy.textContent = paymentReady
        ? ROOM_PRICING_TEXT.paymentStepCopyReferenceReady
        : ROOM_PRICING_TEXT.paymentStepCopyReferenceMissing;
      paymentStateKicker.textContent = paymentReady
        ? ROOM_PRICING_TEXT.paymentStateKickerReferenceReady
        : ROOM_PRICING_TEXT.paymentStateKickerReferenceMissing;
      paymentAmount.textContent = referenceRateText;
      paymentCopy.textContent = paymentReady
        ? ROOM_PRICING_TEXT.summaryReferenceCopyReady
        : `${ROOM_PRICING_TEXT.summaryReferenceCopyMissing} ${ROOM_PRICING_TEXT.summaryReferenceAmountMissing}.`;
      return;
    }

    summaryRatePreview.textContent = "Inquire for direct pricing";
    summaryRateState.textContent = paymentReady
      ? ROOM_PRICING_TEXT.summaryReferenceStateReady
      : ROOM_PRICING_TEXT.summaryReferenceStateMissing;
    summaryRateCopy.textContent = paymentReady
      ? ROOM_PRICING_TEXT.summaryReferenceCardCopyReady
      : ROOM_PRICING_TEXT.summaryReferenceCardCopyMissing;
    paymentStepTitle.textContent = paymentReady
      ? ROOM_PRICING_TEXT.paymentStepTitleReferenceReady
      : ROOM_PRICING_TEXT.paymentStepTitleReferenceMissing;
    paymentStepCopy.textContent = paymentReady
      ? "We will confirm the final amount on the secure checkout page after the guest reviews these stay details."
      : ROOM_PRICING_TEXT.paymentStepCopyReferenceMissing;
    paymentStateKicker.textContent = paymentReady
      ? ROOM_PRICING_TEXT.paymentStateKickerReferenceReady
      : ROOM_PRICING_TEXT.paymentStateKickerReferenceMissing;
    paymentAmount.textContent = paymentReady
      ? "Final amount shown at checkout"
      : ROOM_PRICING_TEXT.summaryReferenceAmountMissing;
    paymentCopy.textContent = paymentReady
      ? "Final room rate and deposit will be confirmed before payment."
      : "Final room rate and any deposit request should be confirmed manually until a live payment handoff is configured.";
  }

  function renderRooms() {
    const rooms = getFilteredRooms(ROOM_DATA, state);
    roomCount.textContent = `${rooms.length} room${rooms.length === 1 ? "" : "s"} available`;
    roomList.innerHTML = renderRoomCards(rooms, INQUIRE_URL);
  }

  function openBookingFromQuery() {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const roomId = params.get("book");

    if (!roomId) {
      return;
    }

    const room = roomLookup.get(roomId);

    if (!room) {
      return;
    }

    window.location.assign(`./booking.html?room=${encodeURIComponent(room.id)}`);
  }

  function resetFormState() {
    bookingForm.reset();
    bookingForm.classList.remove("eekos-hidden");
    confirmationBox.classList.remove("is-active");
    confirmationRef.textContent = "Booking reference";
    clearFeedback();
    clearInvalidStates();
    syncDateInputMinimums(checkinInput, checkoutInput);
    updatePaymentUiState();
    updatePaymentCopyForConfig();
  }

  function openModal(room, trigger) {
    if (!roomDetailModal.hidden) {
      closeRoomDetail(false);
    }

    activeRoom = room;
    lastFocusedTrigger = trigger || document.activeElement;
    bodyOverflowBeforeModal = document.body.style.overflow;

    resetFormState();
    setStep(1);
    updateSummary();

    modal.hidden = false;
    document.body.style.overflow = "hidden";
    scrollModalToTop();

    requestAnimationFrame(() => {
      modal.classList.add("is-open");
      checkinInput.focus({ preventScroll: true });
    });
  }

  function closeModal() {
    modal.classList.remove("is-open");

    setTimeout(() => {
      if (!modal.classList.contains("is-open")) {
        modal.hidden = true;
      }
    }, 300);

    activeRoom = null;
    document.body.style.overflow = bodyOverflowBeforeModal;
    clearFeedback();
    clearInvalidStates();

    if (lastFocusedTrigger && typeof lastFocusedTrigger.focus === "function") {
      lastFocusedTrigger.focus();
    }
  }

  function validateStep(step) {
    const result = step === 1
      ? validateStayDetails({
        checkin: checkinInput.value,
        checkout: checkoutInput.value
      })
      : step === 3
        ? validateGuestDetails({
          fullName: fullNameInput.value,
          email: emailInput.value,
          phone: phoneInput.value
        })
        : { valid: true, message: "", field: "" };

    if (!result.valid) {
      if (result.field && fieldMap[result.field]) {
        markInvalidField(result.field, result.message);
      } else {
        setFeedback(result.message);
      }
      return false;
    }

    clearFeedback();
    clearInvalidStates();
    return true;
  }

  function moveToStep(targetStep) {
    if (targetStep > activeStep && !validateStep(activeStep)) {
      return;
    }

    setStep(targetStep);
    updateSummary();
    scrollModalToTop();
  }

  function handleRoomListClick(event) {
    const detailTrigger = event.target.closest("[data-open-room-detail]");

    if (!detailTrigger || !roomList.contains(detailTrigger)) {
      return;
    }

    const roomId = detailTrigger.getAttribute("data-open-room-detail") || "";
    const room = roomLookup.get(roomId);

    if (!room) {
      return;
    }

    openRoomDetail(room, detailTrigger);
  }

  function handleRoomListKeydown(event) {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    const detailTrigger = event.target.closest("[data-open-room-detail]");

    if (!detailTrigger || !roomList.contains(detailTrigger)) {
      return;
    }

    event.preventDefault();

    const roomId = detailTrigger.getAttribute("data-open-room-detail") || "";
    const room = roomLookup.get(roomId);

    if (!room) {
      return;
    }

    openRoomDetail(room, detailTrigger);
  }

  function clearFieldErrorOnEdit(event) {
    const field = event.currentTarget;

    if (field.getAttribute("aria-invalid") === "true") {
      field.removeAttribute("aria-invalid");
      const errorDiv = document.getElementById(`eekos-error-${field.name}`);
      if (errorDiv) {
        errorDiv.textContent = "";
      }
      clearFeedback();
    }
  }

  function trapModalFocus(event) {
    if (event.key !== "Tab" || modal.hidden) {
      return;
    }

    const focusableElements = getFocusableElementsWithin(modal);

    if (!focusableElements.length) {
      return;
    }

    const first = focusableElements[0];
    const last = focusableElements[focusableElements.length - 1];

    if (event.shiftKey && (document.activeElement === first || !modal.contains(document.activeElement))) {
      event.preventDefault();
      last.focus();
      return;
    }

    if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function trapRoomDetailFocus(event) {
    if (event.key !== "Tab" || roomDetailModal.hidden) {
      return;
    }

    const focusableElements = getFocusableElementsWithin(roomDetailModal);

    if (!focusableElements.length) {
      return;
    }

    const first = focusableElements[0];
    const last = focusableElements[focusableElements.length - 1];

    if (event.shiftKey && (document.activeElement === first || !roomDetailModal.contains(document.activeElement))) {
      event.preventDefault();
      last.focus();
      return;
    }

    if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  roomList.addEventListener("click", handleRoomListClick);
  roomList.addEventListener("keydown", handleRoomListKeydown);

  guestButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.guests = button.getAttribute("data-guests") || "all";
      guestButtons.forEach((item) => item.classList.remove("is-active"));
      button.classList.add("is-active");
      renderRooms();
    });
  });

  sortButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.sort = button.getAttribute("data-sort") || "default";
      sortButtons.forEach((item) => item.classList.remove("is-active"));
      button.classList.add("is-active");
      renderRooms();
    });
  });

  featureButton.addEventListener("click", () => {
    state.balconyOnly = !state.balconyOnly;
    featureButton.classList.toggle("is-active", state.balconyOnly);
    renderRooms();
  });

  component.querySelectorAll("[data-next-step]").forEach((button) => {
    button.addEventListener("click", () => {
      const nextStep = Number(button.getAttribute("data-next-step"));
      moveToStep(nextStep);
    });
  });

  component.querySelectorAll("[data-prev-step]").forEach((button) => {
    button.addEventListener("click", () => {
      const previousStep = Number(button.getAttribute("data-prev-step"));
      setStep(previousStep);
      updateSummary();
      scrollModalToTop();
    });
  });

  [checkinInput, checkoutInput, adultsInput, childrenInput].forEach((field) => {
    field.addEventListener("input", () => {
      clearFieldErrorOnEdit({ currentTarget: field });
      updateSummary();
    });
    field.addEventListener("change", () => {
      clearFieldErrorOnEdit({ currentTarget: field });

      if (field === checkinInput) {
        syncDateInputMinimums(checkinInput, checkoutInput);
      }

      updateSummary();
    });
  });

  [fullNameInput, emailInput, phoneInput, arrivalInput, specialRequestsInput].forEach((field) => {
    field.addEventListener("input", clearFieldErrorOnEdit);
    field.addEventListener("change", clearFieldErrorOnEdit);
  });

  roomDetailClose.addEventListener("click", () => {
    closeRoomDetail();
  });

  roomDetailModal.addEventListener("click", (event) => {
    if (event.target === roomDetailModal) {
      closeRoomDetail();
    }
  });

  roomDetailBook.addEventListener("click", () => {
    if (!activeDetailRoom) {
      return;
    }

    const bookingTrigger = roomList.querySelector(`[data-open-room-detail="${activeDetailRoom.id}"]`) || roomDetailBook;
    openModal(activeDetailRoom, bookingTrigger);
  });

  roomDetailThumbs.addEventListener("click", (event) => {
    const thumb = event.target.closest("[data-detail-image]");

    if (!thumb || !activeDetailRoom) {
      return;
    }

    const imageUrl = thumb.getAttribute("data-detail-image") || "";
    const imageIndex = Number(thumb.getAttribute("data-detail-index") || 0);
    setDetailMainImage(imageUrl, activeDetailRoom.name, imageIndex);

    roomDetailThumbs.querySelectorAll(".eekos-room-thumb").forEach((button) => {
      button.classList.remove("is-active");
    });

    thumb.classList.add("is-active");
  });

  bookingForm.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!validateStep(1) || !validateStep(3) || !activeRoom) {
      return;
    }

    if (!isPaymentReady()) {
      setStep(3);
      setFeedback(BOOKING_UI_TEXT.paymentMissingNote);
      submitButton.focus({ preventScroll: true });
      scrollModalToTop();
      return;
    }

    const reference = createBookingReference();
    const paymentUrl = buildPaymentHandoffUrl(PAYMENT_CONFIG.paymentUrl, {
      room: activeRoom.name,
      room_id: activeRoom.id,
      checkin: checkinInput.value,
      checkout: checkoutInput.value,
      adults: adultsInput.value || "2",
      children: childrenInput.value || "0",
      full_name: fullNameInput.value.trim(),
      email: emailInput.value.trim(),
      phone: phoneInput.value.trim(),
      arrival_time: arrivalInput.value.trim(),
      special_requests: specialRequestsInput.value.trim(),
      reference
    });

    confirmationRef.textContent = `Booking reference - ${reference}`;
    updatePaymentCopyForConfig();
    bookingForm.classList.add("eekos-hidden");
    confirmationBox.classList.add("is-active");
    clearFeedback();

    if (!paymentUrl) {
      return;
    }

    if (PAYMENT_CONFIG.openInNewTab) {
      const paymentWindow = window.open(paymentUrl, "_blank", "noopener");

      if (!paymentWindow) {
        window.location.assign(paymentUrl);
      }

      return;
    }

    window.location.assign(paymentUrl);
  });

  closeConfirmation.addEventListener("click", closeModal);
  modalClose.addEventListener("click", closeModal);

  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      closeModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (!modal.hidden) {
      if (event.key === "Escape") {
        closeModal();
        return;
      }

      trapModalFocus(event);
      return;
    }

    if (!roomDetailModal.hidden) {
      if (event.key === "Escape") {
        closeRoomDetail();
        return;
      }

      trapRoomDetailFocus(event);
    }
  });

  syncDateInputMinimums(checkinInput, checkoutInput);
  updatePaymentUiState();
  updatePaymentCopyForConfig();
  roomNote.textContent = ROOM_DATA.some((room) => getRoomStartingRate(room) > 0)
    ? ROOM_PRICING_TEXT.roomGuideLiveNote
    : ROOM_PRICING_TEXT.roomGuideNote;
  renderRooms();
  openBookingFromQuery();
}
