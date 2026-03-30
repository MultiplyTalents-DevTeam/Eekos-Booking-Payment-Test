export const roomSelectorTemplate = `
<section id="eekos-room-selector" aria-label="EEKOS room selection">
  <div class="eekos-room-shell">
    <div class="eekos-room-toolbar">
      <span class="eekos-toolbar-label">Guests</span>
      <div class="eekos-pill-group" data-group="guests">
        <button type="button" class="eekos-pill is-active" data-guests="all">All</button>
        <button type="button" class="eekos-pill" data-guests="1-2">1-2</button>
        <button type="button" class="eekos-pill" data-guests="3-4">3-4</button>
        <button type="button" class="eekos-pill" data-guests="5+">5+</button>
      </div>

      <span class="eekos-toolbar-label">Sort</span>
      <div class="eekos-pill-group" data-group="sort">
        <button type="button" class="eekos-pill is-active" data-sort="default">Featured</button>
        <button type="button" class="eekos-pill" data-sort="size">Size</button>
      </div>

      <button type="button" class="eekos-feature-toggle" data-feature="balcony">Balcony</button>
    </div>

    <div class="eekos-room-meta">
      <p class="eekos-room-count" id="eekos-room-count">7 rooms available</p>
      <p class="eekos-room-note" id="eekos-room-note">
        Choose a room, select your dates, and review pricing before you continue to checkout.
      </p>
    </div>

    <div class="eekos-room-list" id="eekos-room-list"></div>
  </div>

  <div class="eekos-room-detail-modal" id="eekos-room-detail-modal" hidden>
    <div class="eekos-room-detail-dialog" role="dialog" aria-modal="true" aria-labelledby="eekos-room-detail-title">
      <button
        type="button"
        class="eekos-room-detail-close"
        id="eekos-room-detail-close"
        aria-label="Close room details"
      >&times;</button>

      <div class="eekos-room-detail-layout">
        <div class="eekos-room-detail-media">
          <img id="eekos-room-detail-main-image" src="" alt="Room preview">
          <div class="eekos-room-detail-thumbs" id="eekos-room-detail-thumbs"></div>
        </div>

        <div class="eekos-room-detail-content">
          <p class="eekos-room-detail-eyebrow" id="eekos-room-detail-eyebrow">Room type</p>
          <h3 class="eekos-room-detail-title" id="eekos-room-detail-title" tabindex="-1">Room</h3>
          <p class="eekos-room-detail-price" id="eekos-room-detail-price">From rate</p>

          <ul class="eekos-room-detail-specs" id="eekos-room-detail-specs"></ul>
          <p class="eekos-room-detail-description" id="eekos-room-detail-description"></p>

          <div class="eekos-room-detail-tags" id="eekos-room-detail-tags"></div>

          <div class="eekos-room-detail-amenities-wrap">
            <p class="eekos-room-details-title">Room details</p>
            <ul class="eekos-room-detail-amenities" id="eekos-room-detail-amenities"></ul>
          </div>

          <div class="eekos-room-detail-actions">
            <button type="button" class="eekos-btn eekos-btn--primary" id="eekos-room-detail-book">Check dates &amp; price</button>
            <a class="eekos-btn eekos-btn--secondary" id="eekos-room-detail-inquire" href="#inquire">Inquire</a>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="eekos-booking-modal" id="eekos-booking-modal" hidden>
    <div class="eekos-booking-dialog" role="dialog" aria-modal="true" aria-labelledby="eekos-booking-title">
      <div class="eekos-booking-main">
        <div class="eekos-booking-top">
          <div>
            <p class="eekos-booking-kicker">Secure your stay</p>
            <h2 class="eekos-booking-title" id="eekos-booking-title">Reserve your stay</h2>
          </div>
          <button type="button" class="eekos-modal-close" id="eekos-modal-close" aria-label="Close booking modal">&times;</button>
        </div>

        <div class="eekos-stepper" aria-label="Booking steps">
          <div class="eekos-step is-active" data-step-indicator="1">Stay</div>
          <div class="eekos-step" data-step-indicator="2">Pricing</div>
          <div class="eekos-step" data-step-indicator="3">Guest</div>
        </div>

        <p class="eekos-form-feedback" id="eekos-form-feedback" role="alert" aria-live="polite"></p>

        <form id="eekos-booking-form" novalidate>
          <div class="eekos-step-pane is-active" data-step-pane="1">
            <h3 class="eekos-section-label">Choose your stay</h3>
            <p class="eekos-section-copy">Select your dates and guest count first so you can review pricing before checkout.</p>

            <div class="eekos-field-grid">
              <div class="eekos-field">
                <label for="eekos-checkin">Check-in</label>
                <input type="date" id="eekos-checkin" name="checkin" required>
                <div class="eekos-field-error" id="eekos-error-checkin" aria-live="polite"></div>
              </div>

              <div class="eekos-field">
                <label for="eekos-checkout">Check-out</label>
                <input type="date" id="eekos-checkout" name="checkout" required>
                <div class="eekos-field-error" id="eekos-error-checkout" aria-live="polite"></div>
              </div>

              <div class="eekos-field">
                <label for="eekos-adults">Adults</label>
                <select id="eekos-adults" name="adults" required>
                  <option value="1">1 adult</option>
                  <option value="2" selected>2 adults</option>
                  <option value="3">3 adults</option>
                  <option value="4">4 adults</option>
                  <option value="5">5 adults</option>
                  <option value="6">6 adults</option>
                </select>
                <div class="eekos-field-error" id="eekos-error-adults" aria-live="polite"></div>
              </div>

              <div class="eekos-field">
                <label for="eekos-children">Children</label>
                <select id="eekos-children" name="children">
                  <option value="0" selected>0 children</option>
                  <option value="1">1 child</option>
                  <option value="2">2 children</option>
                  <option value="3">3 children</option>
                  <option value="4">4 children</option>
                </select>
                <div class="eekos-field-error" id="eekos-error-children" aria-live="polite"></div>
              </div>

              <div class="eekos-field eekos-field--full">
                <label for="eekos-special-requests">Special requests</label>
                <textarea
                  id="eekos-special-requests"
                  name="special_requests"
                  maxlength="500"
                  placeholder="Arrival time, bed preference, accessibility notes, or any special request."
                ></textarea>
                <div class="eekos-field-error" id="eekos-error-special_requests" aria-live="polite"></div>
              </div>
            </div>

            <div class="eekos-form-actions">
              <span></span>
              <button type="button" class="eekos-btn eekos-btn--primary" data-next-step="2">Review pricing</button>
            </div>
          </div>

          <div class="eekos-step-pane" data-step-pane="2">
            <h3 class="eekos-section-label" id="eekos-payment-step-title" tabindex="-1">Review pricing</h3>
            <p class="eekos-section-copy" id="eekos-payment-step-copy">Review the pricing path for this stay. The exact amount is shown before payment on the secure checkout page.</p>

            <div class="eekos-pricing-review">
              <div class="eekos-summary-payment eekos-summary-payment--step">
                <p class="eekos-booking-kicker eekos-booking-kicker--compact" id="eekos-payment-state-kicker">Starting rate</p>
                <p class="eekos-payment-amount" id="eekos-payment-amount">Starting rate shown below</p>
                <p class="eekos-payment-copy" id="eekos-payment-copy">
                  Starting rates help guests compare rooms first. The final amount and any deposit request are shown before payment.
                </p>
              </div>

              <div class="eekos-review-points" aria-label="What happens next">
                <div class="eekos-review-point">
                  <strong>Before payment</strong>
                  <span>The final amount and any deposit request are shown before payment is completed.</span>
                </div>
                <div class="eekos-review-point">
                  <strong>Reservation policy</strong>
                  <span>Your room is confirmed once payment is completed.</span>
                </div>
              </div>
            </div>

            <div class="eekos-form-actions eekos-form-actions--spacious">
              <button type="button" class="eekos-btn eekos-btn--ghost" data-prev-step="1">Back</button>
              <button type="button" class="eekos-btn eekos-btn--primary" data-next-step="3">Continue with guest details</button>
            </div>
          </div>

          <div class="eekos-step-pane" data-step-pane="3">
            <h3 class="eekos-section-label">Guest details</h3>
            <p class="eekos-section-copy">Add guest details so EEKOS can send checkout and reservation updates for your stay.</p>

            <div class="eekos-field-grid">
              <div class="eekos-field">
                <label for="eekos-full-name">Full name</label>
                <input type="text" id="eekos-full-name" name="full_name" autocomplete="name" autocapitalize="words" maxlength="120" required>
                <div class="eekos-field-error" id="eekos-error-full_name" aria-live="polite"></div>
              </div>

              <div class="eekos-field">
                <label for="eekos-email">Email address</label>
                <input type="email" id="eekos-email" name="email" autocomplete="email" inputmode="email" maxlength="160" required>
                <div class="eekos-field-error" id="eekos-error-email" aria-live="polite"></div>
              </div>

              <div class="eekos-field">
                <label for="eekos-phone">Phone number</label>
                <input type="tel" id="eekos-phone" name="phone" autocomplete="tel" inputmode="tel" maxlength="32" required>
                <div class="eekos-field-error" id="eekos-error-phone" aria-live="polite"></div>
              </div>

              <div class="eekos-field">
                <label for="eekos-arrival-time">Estimated arrival time</label>
                <input type="text" id="eekos-arrival-time" name="arrival_time" maxlength="40" placeholder="Example: 3:00 PM">
                <div class="eekos-field-error" id="eekos-error-arrival_time" aria-live="polite"></div>
              </div>
            </div>

            <p class="eekos-micro" id="eekos-payment-note">
              Best practice: do not collect raw card details inside a custom HTML block. Send the guest to your real GHL payment page, booking engine, or hosted checkout.
            </p>

            <div class="eekos-form-actions eekos-form-actions--spacious">
              <button type="button" class="eekos-btn eekos-btn--ghost" data-prev-step="2">Back</button>
              <button
                type="submit"
                class="eekos-btn eekos-btn--primary"
                id="eekos-submit-booking"
                aria-describedby="eekos-payment-note"
              >
                Continue to secure checkout
              </button>
            </div>
          </div>
        </form>

        <div class="eekos-confirmation" id="eekos-confirmation">
          <div class="eekos-confirmation-card">
            <div class="eekos-confirmation-ref" id="eekos-confirmation-ref">Booking reference</div>
            <h3 class="eekos-confirmation-title">Almost there</h3>
            <p class="eekos-confirmation-text" id="eekos-confirmation-text">
              You are being sent to the secure checkout page, where the final amount and any deposit request can be confirmed for this stay.
            </p>
            <button type="button" class="eekos-btn eekos-btn--primary" id="eekos-close-confirmation">Done</button>
          </div>
        </div>
      </div>

      <aside class="eekos-booking-side">
        <div class="eekos-summary-card">
          <p class="eekos-summary-rate">Your stay</p>
          <h3 class="eekos-summary-room-name" id="eekos-summary-room-name">Room</h3>

          <div class="eekos-summary-list">
            <div class="eekos-summary-row">
              <span>Guests</span>
              <strong id="eekos-summary-guests">2 adults</strong>
            </div>
            <div class="eekos-summary-row">
              <span>Stay dates</span>
              <strong id="eekos-summary-dates">Select dates</strong>
            </div>
            <div class="eekos-summary-row">
              <span>Nights</span>
              <strong id="eekos-summary-nights">-</strong>
            </div>
            <div class="eekos-summary-row">
              <span>Room size</span>
              <strong id="eekos-summary-size">-</strong>
            </div>
            <div class="eekos-summary-row">
              <span>Bed setup</span>
              <strong id="eekos-summary-bed">-</strong>
            </div>
          </div>
        </div>

        <div class="eekos-summary-payment">
          <p class="eekos-summary-title" id="eekos-summary-card-title">Price &amp; policy</p>
          <p class="eekos-summary-highlight" id="eekos-summary-rate-state">See your final amount before checkout</p>
          <p class="eekos-summary-copy" id="eekos-summary-rate-copy">
            The starting rate below helps guests compare rooms. Secure checkout shows the final amount, any deposit request, and the room plan before payment.
          </p>
          <div class="eekos-summary-list">
            <div class="eekos-summary-row">
              <span id="eekos-summary-rate-label">Starting rate</span>
              <strong id="eekos-summary-rate-preview">Starting rate shown below</strong>
            </div>
            <div class="eekos-summary-row" id="eekos-summary-total-row" hidden>
              <span>Estimated total</span>
              <strong id="eekos-summary-total">-</strong>
            </div>
            <div class="eekos-summary-row" id="eekos-summary-deposit-row" hidden>
              <span>Deposit due now</span>
              <strong id="eekos-summary-deposit">-</strong>
            </div>
            <div class="eekos-summary-row" id="eekos-summary-balance-row" hidden>
              <span>Balance at property</span>
              <strong id="eekos-summary-balance">-</strong>
            </div>
          </div>
        </div>

        <div class="eekos-summary-policy">
          <p class="eekos-summary-title">Stay notes</p>
          <ul>
            <li>Starting rates may change based on your dates, taxes, and selected room plan.</li>
            <li>The final amount is shown before the guest chooses how to pay.</li>
            <li>Your room is confirmed once payment is completed.</li>
          </ul>
        </div>
      </aside>
    </div>
  </div>
</section>
`;

