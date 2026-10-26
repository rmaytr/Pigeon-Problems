# Architecture

[← Project](../README.md) · [Development](development.md) · [Case study](portfolio-case-study.md)

## Boundaries and authority

The browser renders the scene, samples input, predicts local movement and presents
interpolated remote state. It cannot submit authoritative positions, scores or
completed deliveries. `server/room.mjs` validates protocol messages and steps the
shared engine. A room has at most four connected pigeons.

Production uses a Cloudflare Worker gateway and a `PigeonRoom` Durable Object per
room. Local development uses Node HTTP and `ws`, with Vite middleware on the same
origin. Both adapters instantiate the same `Room` class.

## Simulation and transport

`src/engine.mjs` advances fixed 1/60-second steps. Input is sent at a target 30 Hz;
authoritative snapshots are broadcast at 20 Hz. Sequence acknowledgments allow
the client to replay outstanding predicted inputs after reconciling server state.
Remote models are interpolated/smoothed between snapshots.

The simulation uses simplified platform/solid AABBs and a custom constrained cargo
solver. Grip anchors come from shared beak/head pose rules. One carrier produces
gravity-driven sag and floor dragging; two carriers support both ends. Damped
rotation and sampled contacts trade general rigid-body fidelity for readable,
bounded cooperative behavior. Throw prediction uses the same free-cargo solver.

Trial definitions and mechanism timing are shared by collision, presentation and
route pilots. Moving platforms carry riders. Crew stamps/checkpoints are shared;
completion requires connected players at the exit and any required parcel resting
there. Disconnected players cannot permanently block a finish.

## Sessions and persistence

- Six-character codes identify rooms. They are invitation identifiers, not passwords.
- Opaque reconnect tickets remain in `sessionStorage` and never enter snapshots.
  A disconnected identity reserves its slot for two minutes.
- The next connected teammate becomes lead after host departure. Superseded
  sockets cannot act for the replacement session.
- Finite-value bounds, normalized input, monotonic sequences, duplicate-action
  rejection, ownership/range checks, payload limits and message rates are checked
  on the server. Production origins are restricted.
- Durable Object storage saves serialized room state about every five active
  seconds and when idle. Its backing implementation is SQLite, but the code uses
  `storage.get/put`, not raw SQL or D1. A sudden failure can roll back that interval.
- Local development stores rooms only in memory. Device-local settings and best
  records use `localStorage`; no account or cross-device synchronization exists.

## Presentation and communication

Three.js constructs all scene and pigeon geometry procedurally. Generated canvas
textures provide brick, paving, fabric and other surface detail. Static geometry
is merged by material; articulated character joints and moving mechanisms remain
separate. Character animation follows movement distance, flight state, cargo load,
landing, gust and emote state. Head yaw is limited to 65 degrees per side.

Optional WebRTC voice uses room WebSockets for signaling and peer connections for
audio. STUN is configured, TURN is not. Tracks and peers are released on leave;
late microphone permission results are stopped. Voice failure does not stop game
WebSockets or pings. Voice is not recorded by the application.

## Module map

| Modules | Responsibilities |
|---|---|
| [`main.mjs`](../src/main.mjs) | DOM/UI lifecycle, input, connection, prediction/reconciliation and settings |
| [`engine.mjs`](../src/engine.mjs), [`world.mjs`](../src/world.mjs) | Fixed-step gameplay, collisions, delivery progression and world definitions |
| [`cargo.mjs`](../src/cargo.mjs), [`pose.mjs`](../src/pose.mjs), [`aim.mjs`](../src/aim.mjs) | Load support/contact, grip/head constraints and trajectory preview |
| [`courses.mjs`](../src/courses.mjs), [`trials.mjs`](../src/trials.mjs) | Six courses, mechanisms, checkpoints, medals and crew completion |
| [`trial-ui.mjs`](../src/trial-ui.mjs), [`trial-view.mjs`](../src/trial-view.mjs) | Trial selection, HUD/results, records and course rendering |
| [`view.mjs`](../src/view.mjs) | Scene, camera, lighting, presentation and effects |
| [`pigeon-model.mjs`](../src/pigeon-model.mjs), [`pigeon.mjs`](../src/pigeon.mjs) | Procedural model and articulated animation |
| [`art-geometry.mjs`](../src/art-geometry.mjs), [`art-batch.mjs`](../src/art-batch.mjs) | Mesh generation and static batching |
| [`materials.mjs`](../src/materials.mjs), [`scenery.mjs`](../src/scenery.mjs) | Generated textures, cached materials and architecture |
| [`voice.mjs`](../src/voice.mjs) | Peer signaling, media permissions, mute and cleanup |
| [`room.mjs`](../server/room.mjs) | Protocol, sessions, validation, stepping and broadcasts |
| [`local.mjs`](../server/local.mjs), [`worker.mjs`](../server/worker.mjs) | Local and Cloudflare hosting adapters |

There are 21 production JavaScript modules: 18 client/shared modules and three
server modules. Test and verification helpers are counted separately.
