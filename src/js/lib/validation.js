import { getNights } from "./booking.js";

function toDateInputValue(date) {
  const normalizedDate = new Date(date);
  normalizedDate.setMinutes(normalizedDate.getMinutes() - normalizedDate.getTimezoneOffset());
  return normalizedDate.toISOString().slice(0, 10);
}

export function syncDateInputMinimums(checkinInput, checkoutInput, now = new Date()) {
  const todayValue = toDateInputValue(now);
  const minCheckoutDate = new Date(`${(checkinInput.value || todayValue)}T00:00:00`);

  minCheckoutDate.setDate(minCheckoutDate.getDate() + 1);

  checkinInput.min = todayValue;
  checkoutInput.min = toDateInputValue(minCheckoutDate);

  if (checkinInput.value && checkoutInput.value && checkoutInput.value <= checkinInput.value) {
    checkoutInput.value = "";
  }
}

export function validateStayDetails({ checkin, checkout }) {
  const todayValue = toDateInputValue(new Date());

  if (!checkin) {
    return {
      valid: false,
      message: "Please select your check-in date.",
      field: "checkin"
    };
  }

  if (!checkout) {
    return {
      valid: false,
      message: "Please select your check-out date.",
      field: "checkout"
    };
  }

  if (checkin < todayValue) {
    return {
      valid: false,
      message: "Check-in cannot be in the past.",
      field: "checkin"
    };
  }

  if (getNights(checkin, checkout) < 1) {
    return {
      valid: false,
      message: "Check-out must be after check-in.",
      field: "checkout"
    };
  }

  return { valid: true, message: "", field: "" };
}

export function validateGuestDetails({ fullName, email, phone }) {
  const trimmedName = String(fullName || "").trim();
  const trimmedEmail = String(email || "").trim();
  const trimmedPhone = String(phone || "").trim();
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneDigits = trimmedPhone.replace(/\D/g, "");

  if (!trimmedName || !trimmedEmail || !trimmedPhone) {
    return {
      valid: false,
      message: "Please complete your name, email, and phone number.",
      field: !trimmedName ? "fullName" : !trimmedEmail ? "email" : "phone"
    };
  }

  if (trimmedName.length < 2) {
    return {
      valid: false,
      message: "Please enter the guest's full name.",
      field: "fullName"
    };
  }

  if (!emailPattern.test(trimmedEmail)) {
    return {
      valid: false,
      message: "Please enter a valid email address.",
      field: "email"
    };
  }

  if (phoneDigits.length < 7) {
    return {
      valid: false,
      message: "Please enter a valid phone number.",
      field: "phone"
    };
  }

  return { valid: true, message: "", field: "" };
}

