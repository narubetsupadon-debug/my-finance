## 1.0.22 — 2026-11-11

- Refresh all primary pages and retained salary/rent/car history screens with consistent spacing, forms and responsive layouts. Preserve financial calculations and routes.
- Explain each secondary menu destination; collapse duplicate quick-capture controls on Home. Retain budget pockets, interactive donut and period filters.
- Add a read-only full-app preview and refresh exact navigation/PWA asset versions.

# 1.0.21 — 2026-11-11

- หน้าภาพรวมแสดงงบที่เปิดใช้งานแยกก้อน ใช้กฎนับรายการเดียวกับหน้างบประมาณ
- แต่ละก้อนแสดงวงเงิน ยอดใช้ ยอดเหลือ/เกินงบ และเปิดรายการประกอบได้
- การ์ดงบรวมระบุชัดเจน พร้อมอัปเดต PWA cache

## 1.0.20 — 2026-11-09

- Keep acknowledged transaction inserts/edits in the current owner cache when follow-up reads fail; reject older read snapshots after confirmed writes. Preserve retry-safe IDs and debt balances.
- Show deferred refresh status while an editor is open. Reject backup downloads after a session changes.
- Add authenticated, security-invoker backup v2 with custom child categories; retain the v1 RPC and read compatibility. No financial row updates or automatic restore.
- Promote reviewed stability Test, regression coverage, guide and exact PWA asset URLs.

## 1.0.19 — 2026-11-05

- Remove the explicit newline from the transaction tab and prevent wrapping for all bottom labels.
- Give the full transaction label a wider slot and reduce the bottom bar to 70px; preserve all five actions and More menu.

## 1.0.18 — 2026-11-05

- Promote the reviewed mobile navigation from Test: fixed 78px bar, aligned icons and full transaction label.
- Replace More tiles with grouped list rows, SVG icons and chevrons; retain six destinations, native dialog close/focus and scroll behavior.
- Apply to all four app entry pages, preserve financial data and update version/PWA assets.

## 1.0.17 — 2026-11-05

- Promote reviewed summary period selector outside the hidden hero: current month, trailing 3/6 months (including current month), current calendar year, custom month/year and inclusive explicit dates.
- Validate date bounds before applying; draft/reversed dates preserve the last applied report. Totals, donut, breakdown, ranking, details and PDF share the same report rows.
- Preserve existing monthly presets, status/future/cancelled rules and data. Update guide and exact PWA module URLs.

## 1.0.16 — 2026-11-05

- Apply the reviewed Refined UI to the existing production pages: typography, surfaces, borders, buttons, semantic colors, and line icons in the bottom menu.
- Retain the DOM structure, menu destinations, section order, white mobile header, safe-area spacing, financial renderers, and data bindings.
- Keep light/dark themes and amount masking. Refresh the CSS/navigation asset URLs and PWA cache.

## 1.0.15 — 2026-11-05

- Promote the reviewed Summary Rev.2 layout: income/expense cards, net total, month arrows, real category/breakdown tabs, and the top-five expense carousel controls.
- Keep the authenticated data source, report scope, totals, rent allocation, PDF export, and existing navigation. Preserve amount masking and dark theme.
- Keep an explicitly selected year even when it has no transactions; refresh PWA caches and version the changed summary import chain.

## 1.0.14 — 5 November 2026
- Loading build 02: keep the startup splash visible for at least 800 ms from its parsed markup while loading finance data concurrently; do not add a fresh delay after a slow startup or on later sign-in. Preserve signed-out/error recovery and session-change guards.
- Refresh startup loading screen with the existing wallet mark, subtle orbit/dots, light/dark palettes, compact landscape layout and reduced-motion support. Preserve session timing and existing visibility/failure behavior.
- Clear automatically suggested debt-payment amounts when the transaction month or selected debt changes. Preserve manually entered amounts, including explicit input of the same number.
- Reset suggestion ownership on new/edit forms. Keep exact debt links and existing debt balances unchanged.
- Refresh payment entrypoint/planning URLs and the service-worker cache together; align displayed release metadata.
- Add regressions for month/debt changes and service-worker install, activation, offline reads, cache isolation, failed precaching and successful retries. Browser lifecycle tests remain necessary for installed PWA/multiple-tab behavior.
- No database/schema or financial history changes.

## 1.0.12 — 30 October 2026
- Promote reviewed direct repayment link Test: save debt_payment:<id> source, retain through edits/renames, explicit unlink and clear on new forms/category changes. No balance mutations or historical backfill.
- Refresh in-app guide for production payment flows, monthly budgets, notifications, widget refresh, backups and historical specialist pages.
- No database/schema, notification or financial calculation changes. Existing source guards inspected for compatibility.

## 1.0.11 — 30 October 2026
- Promote reviewed wallet Test: edited timestamp, configured repayment separate from balance, and matched paid calendar-month history. No financial data rewritten.

## 1.0.10 — 29 October 2026
- Payment picker derives recorded progress from exact, uniquely matched repayment names or explicit debt-payment sources. Excludes future, pending, cancelled, income, duplicate IDs and card charges.
- Complete configured amounts disable the old suggestion; explicit extra payment starts blank. Partial payments suggest the remainder. Calendar month follows selected transaction date, not a bank statement cycle.
- No debt balances or historical records are rewritten. Existing transaction editing hides the picker.

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

