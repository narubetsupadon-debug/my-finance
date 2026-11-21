# My Finance — release safety QA (2026-11-17)

Scope: review v1.0.23 after mobile amount/release-note patch. **This is a test plan, not a claim that production tests passed.**

## P0 — Financial integrity (must pass before release)
- [ ] Create a transaction and force follow-up read failure; confirmed save must remain visible and persistent after reload.
- [ ] Confirm a bill RPC but fail subsequent readback; payment button must stay disabled and show “บันทึกแล้ว · รอซิงก์”. Only clear guard after a matching server row is observed.
- [ ] Lose the bill RPC response; show uncertain state and forbid a blind second payment within the session.
- [ ] Open two tabs; test stale read returned after confirmed insert/edit. Never overwrite confirmed local state.
- [ ] Partial debt payment, full payment, excess payment, edited linked repayment, renamed debt, changed month, and repeat submission. Compare persisted ledger to displayed progress; avoid duplicate IDs.
- [ ] Paid recurring bill stays paid after navigation, reload and new session; unpaid/partial states reconcile to the right calendar month.
- [ ] Test concurrent edits to the same record in different tabs and report the observed conflict behavior.

## P1 — Reporting / data protection
- [ ] Verify dashboard totals = eligible transaction rows, matching date, owner, cancellation and reversal rules.
- [ ] Verify budget pockets don't double count transactions; compare dashboard, budget page and summary.
- [ ] Verify donut selection, Top 5 carousel, details and PDF are consistent for month, trailing 3/6 months, year and inclusive custom date range.
- [ ] Verify backup v2 completeness (transactions, accounts, debts, categories and child categories) without leaking data between accounts.
- [ ] Perform restore drill only in a separate nonproduction test environment using anonymized fixture data; v2 backup is not itself an automatic restore.
- [ ] Install and update PWA across 1.0.22 -> patched build; verify service worker activation, offline fallback, cache isolation and multi-tab lifecycle.
- [ ] Verify account switching and sign-out clear owner-specific UI and cached financial information.

## P2 — Mobile / device lifecycle
- [ ] Test 320/360/390/430 CSS px, long Thai labels, large monetary values, zoom 200%, dark mode and reduced motion.
- [ ] Test keyboard, focus-visible, screen reader names and accessible tap targets for main navigation / entry dialog.
- [ ] On an actual iPhone, verify widget data refresh after a financial transaction and compare timestamp with the app.
- [ ] On an actual iPhone, verify push permission, notification receipt and rejected/expired endpoint recovery.

## Changed in this branch
- Release notes text in Settings now matches release 1.0.23.
- Recurring bills distinguish full, partial and pending payments based on confirmed satang totals; duplicate transaction IDs cannot inflate the paid amount.
- A confirmed bill RPC result is held in a per-user/month guard until its server readback appears, avoiding a second one-tap payment after a read failure. Uncertain transport responses also block blind retries within the session.
- Planning and dashboard expose partial-bill counts; repeated one-tap full-payment is blocked on an already-linked partial bill.
- Dashboard category sums are calculated in satang before presentation.
- Updated JS/CSS asset URLs and PWA shell cache avoid stale logic on app updates.
- Small-screen category amounts may wrap rather than force horizontal overflow.
- Static regression assertions protect both behaviors.

## Gate / ownership
- Run `npm test` in CI (Node 22 / 24) and inspect failures; inspect rendered mobile layout in a real browser.
- Do not merge/release if financial P0 scenarios are unresolved.
- No live Supabase transactions, schema changes or widget schedules are made in this branch. The service-worker cache key and asset URLs were updated; bill classification and category total calculation were changed in code only.
