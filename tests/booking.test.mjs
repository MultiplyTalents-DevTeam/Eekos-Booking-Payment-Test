import test from "node:test";
import assert from "node:assert/strict";

import {
  buildGuestSummary,
  getBookingFinancials,
  getDepositAmount,
  getRoomDisplayRate,
  getNights,
  getRoomReferenceRate,
  getRoomStartingRate
} from "../src/js/lib/booking.js";

test("getNights returns zero for invalid or same-day stays", () => {
  assert.equal(getNights("2026-04-10", "2026-04-10"), 0);
  assert.equal(getNights("2026-04-12", "2026-04-10"), 0);
  assert.equal(getNights("", "2026-04-10"), 0);
});

test("getDepositAmount supports percentage and fixed deposits", () => {
  assert.equal(getDepositAmount(10000, { depositType: "percentage", depositValue: 30 }), 3000);
  assert.equal(getDepositAmount(10000, { depositType: "fixed", depositValue: 2500 }), 2500);
});

test("getBookingFinancials derives totals from nights and room rate", () => {
  const financials = getBookingFinancials({
    room: { startingRate: 4200 },
    checkin: "2026-05-01",
    checkout: "2026-05-04",
    paymentConfig: { depositType: "percentage", depositValue: 25 }
  });

  assert.equal(getRoomStartingRate({ startingRate: 4200 }), 4200);
  assert.equal(financials.nights, 3);
  assert.equal(financials.total, 12600);
  assert.equal(financials.deposit, 3150);
  assert.equal(financials.balance, 9450);
});

test("getRoomReferenceRate returns public display rates without affecting billable rates", () => {
  assert.equal(getRoomReferenceRate({ fromRate: 3250, startingRate: 0 }), 3250);
  assert.equal(getRoomStartingRate({ fromRate: 3250, startingRate: 0 }), 0);
  assert.equal(getRoomDisplayRate({ fromRate: 3250, startingRate: 0 }), 3250);
  assert.equal(getRoomDisplayRate({ fromRate: 3250, startingRate: 4100 }), 4100);
});

test("buildGuestSummary formats adults and children cleanly", () => {
  assert.equal(buildGuestSummary("2", "1"), "2 adults, 1 child");
  assert.equal(buildGuestSummary("1", "0"), "1 adult");
});
