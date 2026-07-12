# Design QA — Persistent shell and content expansion

## Scope

- Four-tab persistent app shell.
- Programmatic ambient texture and unified selected-state treatment.
- Selection-only vertical rail.
- Typed/handwritten Burn modes.
- 24-entry psychology knowledge index.
- Six representative real audio tracks.

## Verification

- Unit tests: 2/2 passed.
- Production build: passed.
- Browser checks:
  - primary routes show exactly one persistent tab bar;
  - meditation and knowledge detail routes show no tab bar;
  - first state tap selects without navigation and second tap enters scenes;
  - 6 knowledge groups and 24 entries render with no meditation links;
  - typed Burn ignites after inactivity and handwriting Canvas mounts;
  - tested routes have no horizontal overflow or console errors.
- Audio assets: all six MP3 derivatives return HTTP 200; WAV masters were not modified.

## Findings

- P0: none.
- P1: none.
- P2: none.
- P3: automated in-app browser does not expose audible playback state, so final acoustic output should also be listened to once on a physical phone; source files, loading path and controls are wired.

final result: passed
