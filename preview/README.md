# My Finance — UI Preview (staging)

Preview URL: https://narubetsupadon-debug.github.io/my-finance/preview/

## Release agreement
- All **app updates (UI, behavior, backend and Widget changes)** are implemented and reviewed in `preview/` first.
- Do not edit production `index.html`, `style.css`, `ui-polish.css` or app UI files merely to experiment with appearance.
- Promote changes to production only after the owner explicitly approves the preview.
- Preserve original production behavior and data; never reset/seed/replace database data as part of a visual change.

## Data and security
- Preview uses **the production Supabase project** through the public publishable key and authenticated RLS, so displayed information comes from the logged-in user's real data.
- Preview is **read-only**. Do not add insert/update/upsert/delete calls, RPC mutations or write-capable backend credentials. Buttons that resemble saving must explicitly state that nothing is saved.
- Do not embed passwords, access tokens, refresh tokens, personal details or service-role keys.
- Never use public fixtures or placeholder totals if live-data fetching fails: display a sign-in or error state instead.
- Treat testing sensitive operations (saving, payments, deletion) as a separate task requiring isolation beyond this read-only UI preview.

## Preview smoke checks
1. Open the Preview URL on desktop and iPhone; make sure it does not show amounts before authentication.
2. Sign in with an existing My Finance account; check the month, transaction totals, budget amounts and credit-card balances against the production app.
3. Test the menu, month selector and search; ensure they never mutate the database.
4. If loading fails, show an error — do not fall back to made-up amounts.
5. Check that the production URL continues to behave as before.

Note: The preview currently implements live read-only core screens. Secondary pages are still design placeholders and should not be described as fully functional replicas.

## Notification test — 1.0.1-preview.1

- Open `push-test.html` with the existing My Finance account. The test page does not request notification permission or register/unregister devices.
- `push-reminders-test` is a separate authenticated function. It reads only the signed-in user's enabled registrations and existing VAPID configuration. It never rotates keys or writes/deletes subscriptions or financial records. The production reminder function and 08:00 cron stay unchanged.
- Diagnosis sends nothing. Each test click sends one generic TEST message to one explicitly selected, owned device. A per-isolate cooldown and UI cooldown reduce accidental repeat clicks; this is not a global rate-limit guarantee.
- Compare current sender subject and the website URL candidate. Record the provider reason before inferring a cause. Provider acceptance is separate from the user's confirmation that the alert appeared.
- Logs contain only provider, numeric status, an allowlisted reason and subject variant. Never record raw error bodies, endpoints, auth tokens or VAPID keys.
- Production promotion requires the owner's explicit approval after testing, then a new production version.

## Current-device notification test — 1.0.1-preview.2

- `push-device/` is an independently installable TEST app, with a distinct manifest ID and a service worker scoped to that directory. On iPhone, install/open this Test icon before requesting permission.
- Only a deliberate click requests notification permission and creates a browser push subscription. The subscription is sent transiently to authenticated `test_current`; it is never written to the production database. No production registration is changed or removed.
- Local display test calls the scoped worker's showNotification. Remote test sends one generic TEST message to this browser's subscription with validated provider and key format; it uses the candidate website subject.
- The worker displays push data before any asynchronous receipt storage. Local receipt records contain only receive time and display-request status; no endpoints, tokens, amounts or identities are stored. Receipt confirms worker delivery, not banner visibility.
- Authentication uses a separate storage key. Test receipt cache is scoped by name and URL. No production cache deletion, fetch interception, registration replacement, financial write or cron change.
- Existing registration comparison remains available, explicitly separate from the fresh current-device test.

## Calm analysis preview — 23 October 2026

- `analysis.html` implements the approved calm mobile layout using authenticated real transactions only. No fixture amounts or browser service-worker registration.
- The user filter and existing RLS apply to all paginated transaction reads. Only publishable key is in the browser. No database writes or new backend functions.
- Shows paid expenses through Bangkok today, includes debt repayments, excludes pending/cancelled/future rows. Totals and category bars use the same rows and integer cents. Linked rent/car/salary tables are not added again; recorded rent amounts are not divided again.
- Current month compares to the same day of the previous month (clamped to its last date). Past months compare full month. Missing prior spending has no invented percentage. Weekly bins cover the entire calendar month including days 29–31.
- Up to four categories initially; expand to all, tap a category or total for source rows. One deterministic top-category observation. No forecasts or inferred savings claims.
- Supabase read/auth failure hides financial content and provides retry/sign-in, never sample data. Dark mode follows device preferences. Production remains unchanged until explicit approval.

## Proportion card only — revised scope

- `proportion.html#summary` uses the current production document and modules with the existing read-only Test guard. Only the expense proportion card receives presentation overrides.
- The donut is hidden and the original category rows get bars from their already-rendered percentages. Original totals, filters, grouping, expandable subcategories and calculations remain intact. No weekly dashboard changes.
- `analysis.html` is an earlier separate experiment, not the approved scope for this revision. Production files are unchanged.
