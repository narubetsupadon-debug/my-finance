# App versions

Version tracking starts at **1.0.0** on 2026-10-21. Earlier releases are not assigned numbers retroactively.

## Release procedure

- `APP_VERSION.json` records the published app version, release date in Bangkok, and user-facing notes.
- Update the version, date, and notes in Settings in `index.html` together with this file. These are static so the installed app displays the version of its loaded shell, including offline.
- Use `major.minor.patch`: patch for fixes, minor for compatible new features, major for a substantial incompatible change. Never reuse a published version for a later app change.
- Update the service worker cache when publishing. Change JS/CSS query versions when those assets change, keeping shared versions consistent.
- Record the release here, run the checks relevant to the changes, and verify the published version. Preview work does not increment the production version until promoted.

## 1.0.0 — 2026-10-21

- Added app version, release date, and expandable release notes to Settings.
- Began explicit app version numbering from this release.
