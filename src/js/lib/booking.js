export function formatCurrency(value, currency = "PHP") {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

export function formatDateValue(value) {
  if (!value) {
    return "";
  }

  const date = new Date(`${value}T00:00:00`);

  return date.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

export function getNights(checkin, checkout) {
  if (!checkin || !checkout) {
    return 0;
  }

  const start = new Date(`${checkin}T00:00:00`);
  const end = new Date(`${checkout}T00:00:00`);
  const diff = end.getTime() - start.getTime();
  const nights = Math.round(diff / 86400000);

  return nights > 0 ? nights : 0;
}

export function getRoomStartingRate(room) {
  const rate = Number(room?.startingRate || 0);
  return Number.isFinite(rate) && rate > 0 ? rate : 0;
}

export function getRoomReferenceRate(room) {
  const rate = Number(room?.fromRate || 0);
  return Number.isFinite(rate) && rate > 0 ? rate : 0;
}

export function getRoomDisplayRate(room) {
  return getRoomStartingRate(room) || getRoomReferenceRate(room);
}

export function getDepositAmount(total, paymentConfig) {
  if (!total || total <= 0) {
    return 0;
  }

  if (paymentConfig.depositType === "fixed") {
    return Math.max(Number(paymentConfig.depositValue) || 0, 0);
  }

  return Math.round(total * ((Number(paymentConfig.depositValue) || 0) / 100));
}

export function buildGuestSummary(adultsValue, childrenValue) {
  const adults = Number(adultsValue || 0);
  const children = Number(childrenValue || 0);
  const parts = [];

  if (adults) {
    parts.push(`${adults} ${adults === 1 ? "adult" : "adults"}`);
  }

  if (children) {
    parts.push(`${children} ${children === 1 ? "child" : "children"}`);
  }

  return parts.join(", ") || "Select guests";
}

export function getBookingFinancials({ room, checkin, checkout, paymentConfig }) {
  const nights = getNights(checkin, checkout);
  const rate = getRoomStartingRate(room);
  const total = nights > 0 && rate > 0 ? nights * rate : 0;
  const deposit = getDepositAmount(total, paymentConfig);
  const balance = total > 0 ? Math.max(total - deposit, 0) : 0;

  return { nights, rate, total, deposit, balance };
}

export function getBookingPreviewFinancials({ room, checkin, checkout, paymentConfig }) {
  const nights = getNights(checkin, checkout);
  const startingRate = getRoomStartingRate(room);
  const referenceRate = getRoomReferenceRate(room);
  const rate = getRoomDisplayRate(room);
  const total = nights > 0 && rate > 0 ? nights * rate : 0;
  const deposit = getDepositAmount(total, paymentConfig);
  const balance = total > 0 ? Math.max(total - deposit, 0) : 0;
  const rateSource = startingRate > 0 ? "live" : referenceRate > 0 ? "reference" : "none";

  return { nights, rate, total, deposit, balance, rateSource };
}
