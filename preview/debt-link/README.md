# Direct debt payment link — Test only

Production stays at 1.0.11. Candidate source: candidate-app.js, candidate-index.html, candidate-planning.js. No data/schema changes or historical backfill.

New repayment saves use the existing source field: debt_payment:<selected owner-loaded debt ID>. Renaming description or debt does not break matching. Existing web/import sources are not silently linked; users can select a debt on edit. Explicit unlink or changing away from expense/debt category removes direct repayment source. Other managed sources remain protected. New forms and repeated templates clear prior card selection. Debt balances are never changed by this linkage.

Demo uses only an in-memory database. Modules are derived from source by tests/build-debt-link-preview.cjs. No real auth, database calls, service worker registration or outgoing fetch. Reload resets fixture data. Buttons/links outside the task are blocked or operate only in the mock.

Run TZ=UTC node tests/debt-link.test.cjs. Full TZ=UTC npm test passed against candidate source locally; existing production suite remains unchanged.

Before production promotion, inspect database source constraints and any source-dependent functions, use fresh versioned URLs for app entry, and add exact URLs to service worker shell.
