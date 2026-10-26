# Pigeon Problems — Real-Time 3D Cooperative Browser Game

Live project: https://pigeon-problems.smoky-harp-3438.chatgpt.site/

Project type: interactive web application, multiplayer game, procedural graphics
and distributed real-time simulation.

Development workflow: AI-assisted engineering with OpenAI Codex, driven by iterative
product direction, implementation review, automated verification and versioned releases.

## Portfolio overview

Created and shipped Pigeon Problems, a browser-based 3D cooperative platformer for
one to four players. The game combines shared cargo handling, throwing and
catching, stamina-limited flight and directed wing gusts in a stylized rooftop
neighborhood. Players run a delivery service staffed by pigeons, completing five
authored deliveries or tackling six progressively more demanding platforming
courses. Private room codes and invitation links allow friends to join from
separate devices without installing software or creating accounts.

The project spans gameplay design, frontend engineering, procedural 3D graphics,
custom physics, authoritative multiplayer networking, persistent room state,
optional voice communication, automated testing and public deployment. Its
architecture separates a Three.js client from a Cloudflare Workers backend,
while sharing JavaScript simulation and level definitions between the browser,
server and automated test tools.

The codebase contains 21 production JavaScript modules: 18 client/shared modules
and three server modules. Development focused on responsive interaction,
recoverable failures, consistent simulation rules and a coherent visual identity.

## Verified project metrics

| Metric | Result and scope |
|---|---|
| Room capacity | 1-4 players; cooperative play and playable solo practice |
| Simulation | Fixed 60 Hz server simulation, approximately 16.7 ms per physics step |
| Network cadence | Target 30 Hz client input and 20 Hz authoritative snapshots |
| Production code organization | 21 JavaScript ES modules: 18 client/shared, three server |
| Delivery content | Five deliveries across six connected rooftop areas |
| Trial content | Six courses containing 50 authored platforms and 18 stamp placements |
| Core automated suite | 62 engine, session and voice lifecycle tests passed |
| Browser verification | 65 scripted Chrome checks: 20 core, 15 art/aim, 13 trial UI, 17 release edge cases |
| Public multiplayer route verification | All six trials completed with both two and four real WebSocket clients |
| Latency verification | Movement, stale-input stopping and checkpoint rescue passed with 300 ms added round-trip delay |
| Expert-course rendering sample | 60.2 fps, 16.8 ms p95 frame interval, 100 draw calls and 146,966 reported rendered triangles |
| Delivery rendering sample | 60.2 fps, 16.8 ms p95 frame interval, 141 draw calls and 244,100 reported rendered triangles |

Rendering measurements are approximately four-second, 1440 x 900 local headless
Chrome samples from specific scenes. They are not guarantees for mobile devices,
long sessions or arbitrary hardware. Automated checks are separate from human
playtesting; no user-growth, retention, concurrent-room capacity or coverage
percentage is claimed.

## Languages and technology stack

| Area | Technologies and purpose |
|---|---|
| Application language | JavaScript with native ES modules (`.mjs`), shared across client and server |
| Web interface | HTML5, CSS3, SVG, DOM APIs, responsive layouts and native browser events |
| 3D graphics | Three.js 0.180.0, WebGL, procedural BufferGeometry, CanvasTexture, standard/physical materials, lighting and shadows |
| Local runtime | Node.js; developed with Node 25 and published with Node 24+ and Node 24 CI |
| Local transport | Built-in Node HTTP server and ws 8.22.0 WebSockets |
| Production backend | Cloudflare Workers and a SQLite-backed Durable Object for each room |
| Persistent state | Durable Object storage API for serialized room snapshots; localStorage/sessionStorage for browser-local data |
| Game transport | Native browser WebSockets and JSON input/action/snapshot messages |
| Voice | WebRTC, RTCPeerConnection, getUserMedia, STUN and room-scoped signaling |
| Audio | Web Audio API for synthesized feedback and optional ambience |
| Input | Keyboard/mouse events, Pointer Events and the standard Gamepad API |
| Build tooling | Vite 7.3.7, npm and separate Three.js vendor bundling |
| Verification | Node's built-in test runner, Playwright 1.64.1, Chrome, real WebSocket clients and a latency-injection proxy |
| Deployment | OpenAI Sites for the static client, Wrangler 4.152.0 for Cloudflare, Git and saved release versions |

Version numbers reflect the checked-in lockfile. The project has two direct
runtime package dependencies, Three.js and ws; rendering, input, audio, storage
and voice also use native browser/platform APIs.

## System architecture and real-time networking

The frontend and real-time service are deployed independently. OpenAI Sites serves
the Vite-built browser client. Cloudflare Workers handles room creation and
WebSocket routing, directing each private room to a corresponding PigeonRoom
Durable Object. That object owns the room's simulation, players, cargo,
interactions, progress and score.

Clients send movement inputs and action intents rather than positions or scores.
The server validates those requests, advances the world at a fixed 60 Hz and
broadcasts authoritative snapshots at a target 20 Hz. The client transmits input
at a target 30 Hz, separating transport cadence from simulation and rendering.

Client-side movement prediction provides immediate local feedback. Sequence
acknowledgments identify processed inputs; reconciliation rebuilds predicted
movement from authoritative state and replays outstanding inputs. Remote entities
use interpolated/smoothed presentation. Each player has a camera following their
own pigeon, so cooperative play is not constrained to a single shared view.

Physics, collision queries and level definitions are shared JavaScript modules.
The Node development server and Cloudflare production adapter use the same Room
class and engine. This supports local multiplayer development without requiring
Cloudflare access and reduces the risk of separate browser/server rule sets
drifting apart.

## Session integrity, persistence and recovery

Rooms use six-character invitation codes and opaque reconnect tickets. Player
identity and the reconnect secret are separate, and tickets are excluded from
snapshots broadcast to the crew. A valid reconnect restores the same pigeon;
superseded sockets cannot continue acting for that session.

Server-side controls include finite-value validation, movement normalization,
monotonic input/action sequence checks, duplicate-action rejection, interaction
range and height checks, action cooldowns, payload limits, origin restrictions and
message-rate limits. Course changes and run transitions are host controlled.

Disconnected identities reserve their slot for two minutes, and dispatch-lead
ownership transfers to a connected teammate. The Worker periodically persists
room state, approximately every five active seconds, and saves again when the
room becomes idle. Simulation timers stop when no clients remain. A sudden
restart can therefore roll progress back by the persistence interval; durable
storage is not presented as a zero-loss transaction log.

Completed deliveries and collected stamps survive personal retries. Late joins,
crew-size changes and disconnects preserve shared progress, while disconnected
pigeons do not permanently block a trial's finish condition. Obsolete socket
callbacks are ignored after reconnecting or leaving.

## Custom movement, cargo physics and aiming

The gameplay engine implements acceleration, gravity, hopping, limited flapping,
stamina consumption/refill, jump buffering, coyote time, ledge handling and floor
collision. Approximately 130 ms jump-buffer and coyote windows make platforming
more forgiving. Carrying weight, support from another carrier and dragging affect
movement, connecting cargo behavior to player decisions.

A custom constrained-load solver models cargo held from one or two beak anchors.
With a single carrier, unsupported long objects rotate downward under gravity;
sampled floor contact limits penetration and determines whether the free end is
dragging. With two carriers, cargo position and pitch are coupled to both grip
anchors. Damped angular motion, interpolated grip transitions and bounded
velocities keep pickup, carrying and release readable.

The solver also supports floor settling, retained drop momentum, collision
response and impact-sensitive fragile cargo. This is a purpose-built constrained
simulation with simplified world collision, not unrestricted rigid-body physics.

Aiming is continuous and independent of locomotion. Mouse position, touch drags
and the gamepad right stick determine direction and throw strength. Head rotation
is limited to 65 degrees on either side, while body orientation follows movement.
The same head/aim limits are enforced by server rules and used by beak grip
placement and character animation.

The throw preview advances the same free-cargo integration and collision queries
used by gameplay, forecasting the first impact for up to 180 fixed steps, or
approximately three seconds. This makes the visual arc responsive to walls,
rooftops and the same forces used by the authoritative simulation.

## Authored levels and cooperative systems

Five deliveries introduce distinct loads and constraints: a light parcel, a long
baguette, fragile eggs, a wind-sensitive sail and a tiered cake. The connected
neighborhood includes gardens, a bakery, laundry rooftops, a wind terrace and an
elevated destination. Permanent detours support completion, while timed vents,
moving platforms, switches and shortcuts reward coordination and experimentation.

The six rooftop trials provide a separate platforming progression:

- Chimney Hop: climbing zigzag jumps and flight management.
- Laundry Leap: moving decks, timed shutters and crosswind.
- Gust Works: timed updrafts and weather-vane-operated bridges.
- Clockwork Crossing: crumbling perches and rotating mail-sorter hazards.
- Freight Expectations: a timed freight lift and required parcel delivery.
- Pigeon Peak: a longer expert course combining previously introduced mechanics.

Across the trials, 50 authored platforms and 18 required stamp placements create
routes that cannot be completed by walking alone. Moving surfaces transport their
riders; temporary floors use the same timing for visuals and collision. Crews
share stamps and checkpoints and gather at the finish. Cargo objectives require
the parcel to be placed and resting. Local medal/time records and an Express
delivery replay provide lightweight progression without accounts or a grind.

## Procedural graphics, character modeling and animation

The visual system uses original procedural geometry and generated textures.
Architecture includes detailed facades, varied rooflines, shopfronts, windows,
planters, rooftop machinery and layered background buildings. Canvas-generated
color and bump maps provide brick, tile, pavement, slate, wood, fabric and metal
surface detail. Material caching supports reuse across the scene.

The pigeon model uses shaped torso/head contours, custom feather geometry,
folded and extended wing forms, detailed beaks/toes and physical materials for
neck iridescence. A hierarchy of transform groups supports procedural animation
without a separate imported animation asset pipeline.

Animation is driven by simulation state and actual movement. The system includes
distance-based walking gait, planted stance phases, lifted swing steps,
independent head tracking, asymmetric flight strokes, wing-tip motion, airborne
foot retraction, tail extension, carrying lean, landing compression, gust poses
and emotes. Reduced-motion settings suppress decorative movement while retaining
essential gameplay information.

## Rendering performance and resource management

Static architectural meshes are grouped by material and merged into larger
geometries. Empty construction groups are pruned, static transforms are frozen
and solid-color geometry is batched inside articulated character groups. Moving
mechanisms and animated joints remain independent, preserving their movement.

Shared materials and textures are cached, removed scene objects release owned
GPU resources, and the renderer caps device pixel ratio to limit excessive
resolution on high-density screens. Vite separates Three.js into its own vendor
bundle.

In the recorded 1440 x 900 expert-course sample, the renderer reported 146,966
triangles and 100 draw calls at approximately 60.2 fps, with a 16.8 ms p95 frame
interval. A separate delivery-scene sample recorded 244,100 reported triangles,
141 draw calls and approximately 60.2 fps. These are different scenes and should
not be presented as a measured percentage improvement between revisions.

## Communication, interface and input design

Optional WebRTC voice uses room-scoped signaling over the existing game
connection, while audio flows through peer connections. Microphone permission,
mute preferences, per-peer muting, volume and explicit voice departure are
managed separately from gameplay. Pending microphone requests are invalidated
when leaving; late streams are stopped and duplicate requests are prevented.
STUN supports direct connection discovery; a TURN relay is not configured.

Four contextual pings and pigeon emotes provide communication when voice is
disabled or unavailable. Synthesized Web Audio feedback communicates deliveries,
stamps, catches, impacts and other events, with separate sound, ambience and
voice volume controls.

The interface includes room creation/joining, invitation links, host controls,
course selection, contextual objectives, cargo condition, wing power, checkpoint
recovery, results, medals and rematches. Keyboard remapping, touch controls,
standard gamepad input, reduced motion, color-independent player numbers and
responsive layouts support different input preferences. Mobile layout checks
include 320-pixel width and assertions that key HUD panels do not overlap.

## Verification, deployment and release engineering

The core automated suite contains 62 engine, session and voice lifecycle tests.
Coverage includes input validation, cargo ownership, gravity-driven sag, floor
contact, two-carrier behavior, head limits, throwing/catching, progression,
duplicate-action rejection, host control, reconnect secrecy, serialized room
restoration, mechanism timing and complete course routes.

The documented Chrome suites contribute 65 scripted checks across core gameplay,
art/aim/input, trial UI and release-edge scenarios. Tests use ordinary inputs and
read-only diagnostics for gameplay; explicitly isolated failure scenarios inject
HTTP outages or obsolete WebSocket messages. They also verify microphone cleanup,
hidden/cancelled touch input, form submission, mobile layout and resource release.

All six courses were completed by a keyboard-driven solo browser pilot. Separate
two-client and four-client public WebSocket runs completed every course, checked
identical crew results and exercised rematches. A real proxy added 150 ms delay
in each direction to verify public movement, stale-input stopping and checkpoint
rescue under 300 ms additional round-trip latency.

The production client is built with Vite and published through OpenAI Sites using
Git-backed source synchronization, a build-output archive and saved release
versions. Wrangler deploys the independent Cloudflare service. Setup,
architecture, verification evidence, known limits and a previous-release rollback
path are documented. The public repository adds a Node 24 GitHub Actions workflow for core tests,
production builds, documentation checks and local WebSocket/browser QA. Its actual
status is visible in the README badge. Sustained high-concurrency load testing
remains outside the verified scope.

## Module map

| Modules | Responsibility |
|---|---|
| `main.mjs` | Application lifecycle, DOM UI, input sampling, networking, prediction/reconciliation and local settings |
| `engine.mjs`, `world.mjs` | Fixed-step gameplay, action validation, movement, scoring, shared geometry and delivery data |
| `cargo.mjs`, `pose.mjs` | Cargo support/contact, grip anchors, dragging, angular behavior and head/beak constraints |
| `aim.mjs` | Direction/power validation, launch parameters and collision-aware trajectory prediction |
| `courses.mjs`, `trials.mjs` | Authored trial data, mechanism timing, checkpoints, stamps, cargo goals and crew completion |
| `trial-ui.mjs`, `trial-view.mjs` | Course selection, trial HUD/results, local records and mechanism/scenery rendering |
| `view.mjs` | Three.js scene lifecycle, camera, lighting, player presentation and gameplay effects |
| `pigeon-model.mjs`, `pigeon.mjs` | Procedural character construction, articulated transforms and state-driven animation |
| `art-geometry.mjs`, `art-batch.mjs` | Reusable mesh generation, geometry merging and static batching |
| `materials.mjs`, `scenery.mjs` | Generated textures, material caching, architecture and background composition |
| `voice.mjs` | WebRTC signaling, peer/media lifecycle, mute controls and permission cancellation |
| `server/room.mjs` | Session ownership, bounded message handling, authoritative stepping and broadcasts |
| `server/local.mjs` | Node HTTP/WebSocket development adapter with Vite middleware |
| `server/worker.mjs` | Cloudflare gateway, Durable Object room hosting, creation throttling and persistence |

## Engineering value and defensible achievement statements

- Built a deployed 1-4 player 3D cooperative web game with a shared JavaScript
  simulation, procedural graphics and a separate authoritative multiplayer service.
- Implemented a 60 Hz simulation with client movement prediction, sequence-based
  reconciliation, target 30 Hz input and target 20 Hz snapshots.
- Developed custom shared-cargo physics and a collision-aware throw preview using
  the same integration rules as authoritative gameplay.
- Authored five deliveries and six trial courses with 50 platforms, 18 stamp
  placements, moving surfaces, timed hazards and persistent checkpoint recovery.
- Created original procedural pigeon models, materials, architecture and
  movement-driven animation, supported by static geometry batching and GPU
  resource management.
- Verified behavior with 62 core automated tests, 65 scripted browser checks,
  complete public two/four-client course runs and 300 ms added latency checks.
- Recorded approximately 60.2 fps in short local 1440 x 900 rendering samples,
  including an expert scene reporting approximately 147,000 triangles in 100 draw
  calls.

The project demonstrates end-to-end ownership of an interactive application:
translating an experience into requirements, separating simulation from
presentation, handling asynchronous session/media lifecycles, building observable
test tools and iterating through deployable releases. AI-assisted development is
part of its workflow; automated evidence is not substituted for human usability
testing or claims about unmeasured production scale.

## Evidence references

- [README](../README.md): setup, stack, architecture, controls and deployment.
- `docs/testing.md`: versioned verification record and benchmark scope.
- `docs/submission-audit.md`: verified lifecycle fixes and remaining limits.
- `evidence/trials-ui-results.json`: expert-course rendering sample and 13 UI checks.
- `evidence/neighborhood-performance.json`: delivery rendering sample.
- `evidence/browser-results.json`, `evidence/art-browser-results.json`,
  `evidence/release-browser-results.json`: scripted browser results.
- `evidence/trials-network-2.json`, `evidence/trials-network-4.json`: public
  six-course multiplayer completion results.

Prepared from the current source, lockfile and recorded evidence. Benchmark and
test evidence dates are October 26, 2026. Physical gamepads, a complete browser and
device matrix, sustained load capacity and human fun/balance studies remain
outside the verified scope.
