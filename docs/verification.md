# Verification and evidence

[← Project](../README.md) · [Development commands](development.md) · [Historical log](testing.md)

## Reproducible checks

Run `npm ci`, `npm test`, `npm run docs:check` and `npm run build` from a fresh
checkout. Then run `npm run test:integration`. Install Playwright Chromium with
`npx playwright install chromium` (`--with-deps` on Linux) and run `npm run test:ui`.
Both managed runners start/stop their own local Node server and explicitly target
localhost. They do not require credentials or contact the public backend.

| Layer | Command / scripts | What is asserted |
|---|---|---|
| Core rules | `npm test` — six `.test.mjs` files, 62 tests | Movement/cargo, aim, trial routes, mechanism timing, input/session validation and voice resource lifecycle |
| Real transport | `npm run test:integration` — `network`, `aim-network`, `latency` | Two/four clients, grip ownership, reconnect/host migration, aim bounds/replication and 300 ms added round-trip delay |
| Rendered browser | `npm run test:ui` — `browser`, `art-browser`, `trials-ui-browser`, `release-browser` | 65 scripted checks: 20 + 15 + 13 + 17 |
| Production bundle | `npm run build` | Actual Vite build of the static client |
| Documentation | `npm run docs:check` | Repository-relative Markdown links/anchors, image signatures and portable paths |

UI checks use actual rendered game pages and ordinary input actions. Explicitly
isolated failure cases mock an HTTP outage/obsolete socket callbacks. Microphones
and gamepads are simulated. The tests do not prove real microphone intelligibility,
physical-controller compatibility, enjoyment or balance. Read-only
`window.pigeonDiagnostics()` supports assertions; production has no test-only
position/state write endpoint.

CI runs on Ubuntu with Node 24 and downloaded Chromium. Local Chrome runs are
reported separately. Software WebGL is enabled in browser verification for runners
without a hardware GPU; timing/performance in CI is not used as a benchmark.

## Longer route checks

With `npm run dev` already running, set `TEST_URL` and `CLIENT_URL` to localhost
and `NO_REPORT=1` before running:

- `node tests/trials-browser.mjs`: all six solo routes driven by normal keyboard input.
- `node tests/trials-network.mjs`: all six real WebSocket crew routes; set
  `CREW_SIZE=2` or `4`.
- `node tests/full-shift.mjs` / `node tests/browser-shift.mjs`: five-delivery completion
  through network or keyboard input, including Express replay.
- `node tests/art-performance.mjs`: a short scene-specific local rendering sample.

These longer end-to-end pilots are not part of every PR's CI smoke run. Do not
interpret a passing smoke run as replaying every saved historical route.

## Saved evidence: October 26, 2026

The JSON files in `evidence/` are historical development/release reports, retained
with their original dates and targets. Their room codes identify expired test runs,
not permanent demo rooms. `NO_REPORT=1` prevents CI from replacing these records;
generated screenshots are ignored. The source publication does not rerun load
against the production game by default.

| Report | Evidence |
|---|---|
| [Core browser](../evidence/browser-results.json) | 20 scripted Chrome checks |
| [Art/aim](../evidence/art-browser-results.json) | 15 checks including replicated mouse aim, touch throws and simulated gamepad aim |
| [Trial UI](../evidence/trials-ui-results.json) | 13 checks, plus expert-course rendering sample |
| [Release edges](../evidence/release-browser-results.json) | 17 checks including injected outage/races, microphone cleanup and 320px mobile layout |
| [Solo routes](../evidence/trials-browser-results.json) | All six keyboard-driven courses |
| [Two clients](../evidence/trials-network-2.json), [four clients](../evidence/trials-network-4.json) | All six public server courses, identical results and rematches |
| [Delivery rendering](../evidence/neighborhood-performance.json) | Short local sample of the delivery neighborhood |

The recorded expert sample is 241 frames in approximately 4.005 seconds at
1440 × 900 in local headless Chrome: 60.17 fps, 16.8 ms p95 frame interval,
100 draw calls and 146,966 reported rendered triangles. A separate neighborhood
sample reports 60.23 fps, 141 draw calls and 244,100 triangles. They are different
scenes, not a controlled before/after optimization comparison. Hardware/driver
details were not captured in those reports; no broad GPU performance claim follows.

The historical [testing log](testing.md) retains earlier revision counts and
measurements. Its superseded figures and the [submission audit](submission-audit.md)
are context, not current CI status or an official contest score.

## Remaining validation

Newcomer and geographically separated human playtests, Safari/Firefox, real phones,
physical gamepads, low-end hardware, long sessions, sustained room concurrency
and restrictive-network voice remain incomplete. There is no measured coverage
percentage or production capacity benchmark. STUN-only voice can fail behind NAT;
game WebSockets and pings remain independent.
