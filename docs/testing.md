# Verification record — October 26, 2026

> Historical development/release record (October 2026). Earlier counts, art descriptions and submission details may be superseded. See [current setup](development.md), [verification](verification.md) and [README](../README.md).

These are automated engine, real-network and scripted browser checks. They are
not human playtesting, a fun/balance certification or an exhaustive device matrix.

## Current submission audit fixes

The [submission audit](submission-audit.md) records the release surface, verified
fixes, rollback and remaining human checks. **62 engine/session/voice tests** and
**65 Chrome browser checks** pass (20 core, 15 aim/art, 13 trial UI, 17 release edge
checks). The new cases cover delayed microphone permission, duplicate requests,
obsolete sockets, failed room creation, Enter submission, hidden/cancelled touch
input, trial voice controls and nonoverlapping 320-pixel HUD panels.
The public network smoke and 300 ms added round-trip latency checks also pass.
See `tests/voice.test.mjs`, `tests/release-browser.mjs` and
`evidence/release-browser-results.json`. Physics and backend code are unchanged.

## Six-course rooftop trials release

- **59 engine/session tests** pass, including all six courses completed by normal
  input in both solo and four-pigeon simulations. Walking alone cannot finish any
  course. Tests cover riders on moving decks/lifts, temporary bridge collision,
  fan timing, collapsing roofs, jumping sorters, host selection, crew finish rules,
  parcel placement, late joins, persistence, retries, backtracking and rematches.
- **All six courses complete through ordinary keyboard input in Chrome**, with
  all required stamps, results and saved best medals. No position-write or
  simulation-write hooks are used. See `evidence/trials-browser-results.json`;
  `evidence/rooftop-trials-demo.webm` records an actual keyboard run.
- **13 additional browser checks** pass for online host/guest course selection,
  rendered jump replication, refresh identity/course recovery, checkpoint retry,
  reduced motion, mobile selector scrolling and touch flapping. The original
  **20 browser regression checks** also pass for delivery mode, multiplayer,
  voice lifecycle, input remapping and touch. See `evidence/trials-ui-results.json`
  and `evidence/browser-results.json`.
- All six courses pass a local **four-client real WebSocket** run, including
  identical results, shared stamps, crew finish, parcel delivery and rematch.
  See `evidence/trials-network-local-4.json`.
- The deployed Worker completes **all six courses with both two and four real
  WebSocket clients**, with all stamps, identical crew results and successful
  rematches. Rooms: `48ZN74` and `ZYY94E`. See `evidence/trials-network-2.json`
  and `evidence/trials-network-4.json`. A separate Chrome check also verifies
  that the results screen's Next course button starts Laundry Leap with fresh
  progress after completing Chimney Hop.
- The expert course at 1440×900 in headless Chrome records **60.2 fps** over a
  four-second sample (241 frames; p95 **16.8 ms**, 100 draw calls, 146,966 triangles).
  This is a short measurement on this machine, not a guarantee for every device.
- Both the production Vite build and the separate Worker deployment pass. The
  current course simulation Worker version is
  `94993870-fcc4-4eb5-88b6-fc5850373644`.

## Earlier neighborhood and pigeon model revision

- **30 engine/session tests** pass with the existing movement and cargo rules.
  The update changes rendering, scenery, materials and character construction;
  its authoritative simulation and public Worker remain the validated version
  `dcdf5440-8ebc-4ee2-93ee-a4cc0e7aaa31`.
- **20 browser regression checks**, **15 art/input checks** and **8 movement/load
  checks** pass in Chrome. Coverage includes rendered multiplayer synchronization,
  reconnect and voice lifecycle, stationary head limits, continuous aiming,
  held/released throws, wing cycles, foot lift, dragging, landing, touch throwing
  and simulated gamepad aim. These are scripted checks, not human playtests.
- A full keyboard-driven solo shift completes all five deliveries and the Express
  restart. To capture each destination, set `ART_REVIEW=1` and `CLIENT_URL` to
  `http://127.0.0.1:5173`, then run `node tests/browser-shift.mjs`.
  The pilot now makes a straight final approach based on the beak/grip offset;
  turning at the ring previously swung a correctly simulated load outside it.
  Gait/flight checks observe the relevant animation state instead of assuming
  that a fixed millisecond always lands in the same gait phase.
- `node tests/model-studio.mjs` renders the actual pigeon in three-quarter,
  profile and extended-wing poses. The studio is a local development inspection
  tool. The homepage, all five destinations and mobile views are inspected in
  the real game. No geometry merge errors or uncaught browser errors remain.
- Static facades are batched, empty construction groups are removed, static
  transforms are frozen, and solid colors are combined inside articulated joints.
  A final local 1440×900 headless Chrome sample records **60.2 fps** with cargo and
  the throw preview active (241 frames / 4.002 s; p95 **16.8 ms**; 141 draw calls;
  244,100 triangles). Homepage: **58.7 fps**, p95 **16.9 ms**. These short samples
  describe this machine, not every device. See `evidence/neighborhood-performance.json`.
- The new model and city use original procedural geometry, canvas material maps
  and original small paintings. Existing head limits and load contacts remain.
- The production Vite build passes; the Three.js vendor bundle is separate.

## Earlier grounded movement and load revision

- **30 engine/session tests** pass. New tests cover one-ended gravity-driven sag,
  floor contact at the free end, beak attachment, two-carrier lift, gradual sag
  after a helper releases/disconnects, drop settling, drag resistance, and the
  server-enforced 65-degree head/throw limit without rotating an idle body.
- **8 new Chrome checks** pass using normal mouse/keyboard input: fixed idle body,
  bounded head rotation, first delivery, actual baguette sag/drag, walking foot
  lift, flight with the constrained load, drop settling, and no uncaught errors.
  See `evidence/grounded-browser-results.json` and `tests/grounded-browser.mjs`.
  `evidence/grounded-demo.webm` shows the rendered carrying/movement animation.
- The original **20 Chrome regression checks** pass with the new simulation,
  including rendered online synchronization, reconnect, voice lifecycle and touch.
- A keyboard-only Chrome pilot completes **all five solo deliveries**, reaches
  results and restarts into Express. Both **two-client and four-client full shifts**
  also pass locally with shared cargo, identical results and rematch. These scripts
  use real movement, pickup/placement and collision, with no state-write hooks.
- The updated public Worker also passes complete **two-client** (`FQSEZJ`) and
  **four-client** (`MLCTLM`) shifts, consistent results and rematch. A separate
  public socket check verifies fractional throw direction/power replication and
  the head limit while the stationary body stays fixed. Worker version:
  `dcdf5440-8ebc-4ee2-93ee-a4cc0e7aaa31`.
- Floor collision samples each tilted load along its length. The back bridges were
  moved outward to give the dragging baguette turning clearance around the bakery.
  The throw preview and free cargo share the same fixed-step contact integration.
- Visual inspection covers the homepage, close bird silhouette, walking, dragging
  and flight. Crisp brick/paving/wood/weave replace random paper grain; smooth bird
  surfaces, planted foot stance, folded wings and restrained body motion replace
  the previous heavy outlines and exaggerated character proportions.
- A fresh 1440×900 headless Chrome sample with cargo held and the throw preview
  active records 181 frames over 3.001 seconds (**60.3 fps**, p95 **16.9 ms**),
  153 draw calls and 40,258 triangles. This is a short local rendering sample,
  not a guarantee for every device. See `evidence/grounded-performance.json`.
- The production Vite build passes with the Three.js vendor chunk separated.
- This is a bounded constrained-load model. It does not simulate arbitrary mesh
  contacts, soft-body bread or unrestricted rope dynamics.

## Earlier October 25 baseline

## Passed

- **20 engine/session tests**, including finite/clamped inputs, stale-input stop,
  coyote/jump/flap bounds, shared endpoint exclusivity, range/height validation,
  cargo geometry at the bakery gap, catch bonus deduplication, gust cone/cooldown,
  fall/recall checkpoints, scalable tap switches, fragile impact, results/rematch,
  session secrecy, fifth-player rejection, refresh identity, duplicate actions,
  persistence recovery, restricted signaling and host-controlled Express unlock.
- The solo route solver completes all five orders by walking actual movement and
  collision code through the permanent bridges. It does not teleport after spawn.
- **Early real WebSocket prototype** passed locally and over the public Worker:
  two independent moving clients, grip ownership, reconnect, four clients, speed
  clamp and host migration. This was done before full scene implementation.
- **Complete two-player public shift**, room `DJFD66`: two carriers on all five
  deliveries, valid normal-input routes, identical results and rematch.
- **Complete four-player public shift**, room `24A2J5`: two carriers on all five
  deliveries with two additional moving/pinging scouts, identical results and rematch.
  These are independent socket clients, not four humans.
- **20 scripted Chrome browser checks**: rendered Three.js scene, solo tutorial,
  keyboard lift and grip, first delivery using only keyboard movement/placement,
  recall, remapping, invite into isolated browser context, microphone initially
  muted, peer audio creation, mic toggle, refresh identity/mute preference,
  remote motion/grip synchronization, contextual ping, leaving voice resources,
  mobile overflow, touch flap, and no uncaught browser errors.
  The same 20 checks passed against the actual public Sites URL, including its
  cross-origin production WebSocket connection.
- A separate keyboard-only browser pilot completed **all five solo deliveries**,
  displayed the final score receipt, and restarted into Express. It steers long
  cargo around the bakery architecture rather than using position/state hooks.
- Simulated standard gamepad left stick and A-button flap in Chrome. A physical
  gamepad has not been tested.
- Public WebSocket proxy with **300 ms added round-trip latency**: movement remains
  bounded, silent clients stop after input timeout, and checkpoint rescue succeeds.
- Rendering sample after batching static architecture: **60 fps**, 182 frames over
  3.014 seconds, 95th percentile frame interval 16.9 ms, 73 draw calls and 10,736
  triangles in solo play at 1440×900 on this machine in headless Chrome. This is a
  short local sample, not a promise for all laptops.
- Production Vite build completed. The Three.js vendor chunk is separate for caching.

## Art and independent aiming update

- **25 engine/session tests** pass, including five new cases for continuous aim
  independent of movement, finite angle/power bounds, immediate action aim, preview
  matching actual first impact, and gust direction independent of WASD.
- **15 new Chrome checks** pass for mouse look, stationary and moving aim, head
  anticipation, hold/release throws, continuous launch direction, wing cycles,
  aim replication into another rendered client, touch drag/release and retained
  gamepad right-stick aim. See `evidence/art-browser-results.json`.
- The original **20 browser regression checks** and real two/four-client socket
  checks pass. A keyboard-only full five-delivery browser shift still reaches
  results and Express restart with the new rigs and materials.
- Art direction is a handmade postal diorama: deterministic canvas paper grain,
  brick, tile, wood and woven cloth, printed roof stamps, ink outlines, original
  posters, shutters, water tanks and skyline details. No new third-party assets.
- New character animation uses head/neck/shoulder/wing-tip/feet/tail/satchel joints,
  distance-based gait, asymmetric wing strokes, gliding, landing compression,
  load reach and lean, and throw/catch/gust follow-through. Reduced motion keeps
  stable essential poses and disables rapid cycles.
- New performance sample with the textured scene, articulated pigeon **and active
  throw preview** at 1440×900: 182 frames in 3.014 seconds, **60 fps**, p95 16.9 ms,
  162 draw calls and 22,700 triangles. This remains a local Chrome sample.

## Recovery and authority

Only normal inputs/actions drive socket route tests. No test-only write endpoint
exists in the production application. `window.pigeonDiagnostics()` is read-only
and exposes no reconnect tickets. Lowering the active player count never removes
the permanent route; large cargo scales to solo and all puzzle bridges remain
optional. T rescues a pigeon; Y recalls only current cargo with a stated care cost.

## Evidence and reproduction

`evidence/browser-results.json` lists browser check names and target origin;
screenshots are generated into `evidence/` by the browser test. `tests/full-shift.mjs`
drives an entire shift through ordinary network inputs. Public test rooms are
ephemeral; the recorded codes identify historical runs, not permanent demo lobbies.

On Windows, the initial `node --test` isolated-child invocation failed with sandbox
`spawn EPERM`. The checked-in test command uses Node's supported
`--test-isolation=none` and passes all checks. No assertions were removed to bypass it.

## Remaining limits

Direct room voice has no TURN relay and can fail behind restrictive NAT/firewalls.
Two fake-device browser streams proved signaling/audio-element/mute/resource
lifecycle, not microphone intelligibility between humans. Gameplay/pings work
without voice. Refresh tickets reserve a slot for two minutes; storage recovery
can roll back at most five active seconds after an abrupt server process loss.
No long soak or geographically distributed human playtest was performed.
