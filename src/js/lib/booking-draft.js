const BOOKING_DRAFT_STORAGE_KEY = "eekos_booking_draft_v1";

function hasSessionStorage() {
  return typeof sessionStorage !== "undefined";
}

function hasLocalStorage() {
  return typeof localStorage !== "undefined";
}

export function saveBookingDraft(draft) {
  if (!hasSessionStorage() && !hasLocalStorage()) {
    return false;
  }

  try {
    const serialized = JSON.stringify(draft);

    if (hasSessionStorage()) {
      sessionStorage.setItem(BOOKING_DRAFT_STORAGE_KEY, serialized);
    }

    if (hasLocalStorage()) {
      localStorage.setItem(BOOKING_DRAFT_STORAGE_KEY, serialized);
    }

    return true;
  } catch (error) {
    return false;
  }
}

export function loadBookingDraft() {
  if (!hasSessionStorage() && !hasLocalStorage()) {
    return null;
  }

  try {
    const value = hasSessionStorage()
      ? sessionStorage.getItem(BOOKING_DRAFT_STORAGE_KEY)
      : hasLocalStorage()
        ? localStorage.getItem(BOOKING_DRAFT_STORAGE_KEY)
        : null;

    const fallbackValue = !value && hasLocalStorage()
      ? localStorage.getItem(BOOKING_DRAFT_STORAGE_KEY)
      : null;

    const resolvedValue = value || fallbackValue;

    if (!resolvedValue) {
      return null;
    }

    const parsed = JSON.parse(resolvedValue);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (error) {
    return null;
  }
}

export function clearBookingDraft() {
  if (!hasSessionStorage() && !hasLocalStorage()) {
    return;
  }

  try {
    if (hasSessionStorage()) {
      sessionStorage.removeItem(BOOKING_DRAFT_STORAGE_KEY);
    }

    if (hasLocalStorage()) {
      localStorage.removeItem(BOOKING_DRAFT_STORAGE_KEY);
    }
  } catch (error) {
    // Intentionally ignore storage failures to keep checkout flow uninterrupted.
  }
}
