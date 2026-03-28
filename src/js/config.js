export const PAYMENT_URL_PLACEHOLDER = "YOUR_GHL_PAYMENT_LINK_OR_ORDER_FORM_URL_HERE";

export const PAYMENT_CONFIG = {
  paymentUrl: PAYMENT_URL_PLACEHOLDER,
  depositType: "percentage",
  depositValue: 30,
  currency: "PHP",
  openInNewTab: true
};

export const INQUIRE_URL = "#inquire";

export const BOOKING_UI_TEXT = {
  paymentReadyButtonLabel: "Continue to secure checkout",
  paymentMissingButtonLabel: "Checkout unavailable",
  paymentReadyNote:
    "You will review the final amount and any deposit request on the secure checkout page before payment is completed.",
  paymentMissingNote:
    "Set a real hosted payment URL in the config before launch. Until then, this step should be treated as preview-only and must not be used as a live checkout.",
  paymentReadyConfirmation:
    "You are being sent to the secure checkout page to review the final amount and complete your reservation.",
  paymentMissingConfirmation:
    "A live payment handoff is not configured yet. This preview can collect booking details for review, but it should not be presented as a confirmed reservation or a real payment flow."
};

export const ROOM_PRICING_TEXT = {
  roomGuideNote:
    "Choose a room, select your dates, and review pricing before you continue to checkout.",
  roomGuideLiveNote:
    "Choose your dates to review the estimated stay total before you continue to checkout.",
  cardPriceLabel: "From",
  cardFallbackLabel: "Best available rate",
  cardRateUnavailable: "Inquire for direct pricing",
  cardLiveRateNote:
    "Choose your dates to review the estimated stay total before checkout.",
  cardRateNote:
    "Choose your dates to review pricing before checkout.",
  cardStayNotes: [
    {
      title: "Review pricing first",
      body: "Guests see the final amount before choosing how to pay."
    },
    {
      title: "Reservation policy",
      body: "Rooms are confirmed once payment is completed."
    }
  ],
  summaryReferenceRateLabel: "Starting rate",
  summaryReferenceTitle: "Price & policy",
  summaryReferenceStateReady: "See your final amount before checkout",
  summaryReferenceStateMissing: "EEKOS will confirm the final amount after review",
  summaryReferenceCardCopyReady:
    "The starting rate below helps guests compare rooms. Secure checkout shows the final amount, any deposit request, and the room plan before payment.",
  summaryReferenceCardCopyMissing:
    "The starting rate below helps guests compare rooms. Final pricing and any deposit request should be confirmed manually until live checkout is configured.",
  summaryReferenceAmountReady: "Starting rate shown below",
  summaryReferenceAmountMissing: "Final amount shared after review",
  summaryReferenceCopyReady:
    "The starting rate helps guests compare rooms first. The final amount, any deposit request, and cancellation terms are shown before payment.",
  summaryReferenceCopyMissing:
    "The room card shows a starting rate only. Final room rate and any deposit request should be confirmed manually until a live payment handoff is configured.",
  summaryLiveTitle: "Price & policy",
  summaryLiveState: "Estimated total for selected dates",
  summaryLiveCardCopy:
    "This estimate uses your direct room rate setup. Guests should still see the exact amount and any deposit due before they choose how to pay.",
  summaryLiveAmount: "Estimated total",
  paymentStepTitleReferenceReady: "Review pricing",
  paymentStepTitleReferenceMissing: "Review your booking request",
  paymentStepCopyReferenceReady:
    "Review the pricing path for this stay. The exact amount is shown before payment on the secure checkout page.",
  paymentStepCopyReferenceMissing:
    "Review the stay details below. Final pricing and any deposit request should be confirmed manually until live checkout is configured.",
  paymentStepTitleLive: "Review pricing",
  paymentStepCopyLive:
    "Review the estimated total below before continuing to secure checkout, where the final amount is shown again before payment.",
  paymentStateKickerReferenceReady: "Starting rate",
  paymentStateKickerReferenceMissing: "Reservation review",
  paymentStateKickerLive: "Estimated total"
};

