# Overview preview validation — 27 October 2026

- Production financial JavaScript and original dashboard IDs retained; all changes are in preview files.
- Live preview: authenticated data only, existing PREVIEW_READ_ONLY fetch guard and no service worker registration.
- Explicitly separate static layout fixtures: normal, long names / THB 12,345,678.50 spend / THB 87,654,321.49 remaining, and empty state.
- Browser checked at 320, 360, 390, 430 CSS px: overview and amounts fit without horizontal overflow; full spending amount and remaining budget retained. The 320px stress values use approx. 25.8px and 16.5px respectively.
- Dark theme checked: budget card text rgb(244,246,251) on rgb(20,25,35).
- Physical iPhone keyboard, signed-in user data and write actions have not been exercised by the layout fixtures.
