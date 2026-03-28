# EEKOS Room Selector

This project turns the original all-in-one GHL custom code block into a production-style structure that is easier to review, test, and maintain.

## Structure

- `index.html`
  Static preview page for local browser checks and Vercel preview deploys.
- `src/embed/template.js`
  The single source of truth for the room selector markup.
- `src/styles/`
  Scoped component CSS split into room layout, booking modal, and responsive rules.
- `src/js/config.js`
  Payment and inquiry configuration.
- `src/js/data/`
  Image library and room definitions, including public `fromRate` display guides.
- `src/js/lib/`
  Booking math, validation, filtering, and payment handoff helpers.
- `src/js/ui/render-rooms.js`
  Room-card rendering logic.
- `src/js/app.js`
  Browser wiring for filters, modal flow, summary state, and payment handoff.
- `scripts/build-ghl-embed.mjs`
  Generates a single GHL-ready HTML snippet with inline CSS and JS.
- `dist/eekos-room-selector.html`
  Generated artifact to paste into GHL once you run the build.
- `tests/`
  Node tests for booking math, validation, and payment URL generation.

## Production config points

Update these before going live:

- `src/js/config.js`
  Replace `PAYMENT_URL_PLACEHOLDER` with the real hosted GHL payment page or order form URL.
- `src/js/data/rooms.js`
  `fromRate` values are safe display guides based on recent public listings. Set each room's `startingRate` only when you have direct billable rates that can drive real deposit math.
- Payment handoff safety
  The final payment button is intentionally disabled until a real hosted payment URL is configured.
- GHL / calendar integration
  This component does **not** check live availability yet. Keep your master calendar as the single source of truth and only connect this handoff to real booking confirmation once calendar validation exists.

## Commands

Use either `node` directly or package scripts.

- Build GHL embed: `node ./scripts/build-ghl-embed.mjs`
- Run tests: `node --test --experimental-test-isolation=none ./tests/*.test.mjs`
- Package scripts: `npm run build` and `npm test`

If PowerShell blocks `npm`, use `npm.cmd` instead.

## Deployment flow

1. Use `index.html` for local/Vercel preview validation.
2. Run the build script.
3. Paste `dist/eekos-room-selector.html` into the target GHL custom code block.
4. Verify the real payment URL, room rates, and any GHL field-prefill expectations before production publish.
5. Treat `fromRate` as marketing copy, not the amount to charge. Final room totals still need direct rate confirmation or a live pricing source.
6. QA the modal on phone widths such as `320px`, `375px`, `390px`, and `414px`.

## Notes

- The payment handoff stays on hosted checkout. No raw card collection is handled in the browser.
- Confirmation text is intentionally careful: this flow captures booking intent and hands off to payment. It does not pretend to confirm a reservation by itself.
- If the hosted payment link is still a placeholder, the final CTA stays disabled so preview content cannot masquerade as a live checkout.
- Public `fromRate` pricing is intentionally separated from `startingRate` billing logic so OTA snapshots do not become guaranteed totals or payment amounts by accident.
- Query params are sanitized before handoff, but if you want to reduce URL-carried guest data further, move the handoff behind a server-side endpoint later.

