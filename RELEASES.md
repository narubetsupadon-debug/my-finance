## 1.0.9 — 27 October 2026
- Promote approved mobile overview from Test: full-width spending hero on mobile, compact remaining-budget card, consistent spacing and readable due items.
- CSS only; all financial calculations, IDs, handlers, hidden specialist menus and existing data are preserved.
- Preview QA: 320, 360, 390, 430 CSS px; normal, long-name / multi-million amounts, empty state and dark theme.

## 1.0.8 — 27 October 2026
- Hide salary, rent and car entry points from desktop navigation, More and capture chooser. Preserve detail pages, linked transaction edit routes, all data and report calculations. Keep history access in the usage guide.

## 1.0.7 — 24 October 2026
- Bound the shared entity editor to the viewport; scroll fields independently with a padded, safe-area-aware action footer. Financial handlers and field IDs are unchanged.

## 1.0.6 — 24 October 2026
- Remove the monthly loan payment summary and per-loan payment states at the owner’s request. Restore the original wallet UI; financial records are unchanged.

## 1.0.5 — 24 October 2026
- Version the entry module, planning dependency and loan styling URLs so an older active worker cannot serve the previous loan UI to new HTML. Precache exact new URLs alongside detail-page assets.

## 1.0.4 — 24 October 2026
- Show monthly loan summary above credit cards so it is visible without scrolling past every card.

## 1.0.3 — 24 October 2026
- Monthly loan due, recorded payments, and remaining due shown separately from outstanding balance.
- Current Bangkok month; exact unique repayment descriptions only for legacy web/import records. Pending, cancelled, future payments and charges made via a loan are excluded.
- Unknown installment amounts remain unknown. Display only; no financial records or debt balances are changed.
- New service-worker cache reloads shell assets on installation.

# App versions

Version tracking starts at **1.0.0** on 2026-10-21. Earlier releases are not assigned numbers retroactively.

## Release procedure

- `APP_VERSION.json` records the published app version, release date in Bangkok, and user-facing notes.
- Update the version, date, and notes in Settings in `index.html` together with this file. These are static so the installed app displays the version of its loaded shell, including offline.
- Use `major.minor.patch`: patch for fixes, minor for compatible new features, major for a substantial incompatible change. Never reuse a published version for a later app change.
- Update the service worker cache when publishing. Change JS/CSS query versions when those assets change, keeping shared versions consistent.
- Record the release here, run the checks relevant to the changes, and verify the published version. Preview work does not increment the production version until promoted.

## 1.0.2 — 2026-10-24

- Corrected CSS cascade precedence so collapsed Settings groups actually hide their cards.
- Removed conflicting flex bases that stretched account controls vertically and squeezed accent labels or notification badges.
- Sized Settings controls and cards for 320–430px phones; preserved handlers, IDs, notification registrations and data.
- Updated Settings stylesheet URL and installed-app cache together.

## 1.0.1 — 2026-10-23

- Promoted the owner-approved aqua donut, selected-category center values and top-five expense carousel from Test. Period scopes, financial records and calculation rules remain unchanged.
- Added a stable all-details action, manual carousel controls, pause and reduced-motion support.
- Replaced the push sender's rejected `.local` VAPID subject with the tested website URL; retained existing keys and 08:00 Bangkok schedule.
- Test notifications target the signed-in user's current registered endpoint and report provider acceptance separately from actual device display.
- Updated installed-app cache and Settings version to 1.0.1.

## 1.0.0 — 2026-10-21

- Added app version, release date, and expandable release notes to Settings.
- Began explicit app version numbering from this release.
