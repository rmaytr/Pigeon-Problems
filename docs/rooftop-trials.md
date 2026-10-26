# Rooftop trials

Six authored platforming courses now sit alongside the original five-delivery shift.
Solo practice opens a course selector with the trials prominent and the original
delivery practice available. A crew host can select the same courses in the lobby.
All courses are available immediately; local best medals/times provide progression.

1. Chimney Hop: climbing zigzag rooftops with real gaps and limited flight.
2. Laundry Leap: moving platforms, crosswind and timed shutter crossings.
3. Gust Works: periodic updrafts and a vane-operated temporary bridge.
4. Clockwork Crossing: collapsing perches and a low rotating mail sorter to jump.
5. Freight Expectations: charge and board a freight lift, then deliver a parcel.
6. Pigeon Peak: a longer, higher remix of flight, timing, vanes and narrow landings.

Each course has three required stamps, intermediate checkpoints and a finish pad.
Flight is shorter than in the delivery neighborhood, so landing/resting matters.
There is no permanent walking bridge around the jumps. Falls retry from the latest
checkpoint without losing stamps. Moving platforms carry riders, crumbling roofs
warn before collapsing, and fans/vanes clearly show their active state. Tutorial
prompts are contextual; controls and the refined art/model remain consistent.

Server-owned course state includes stamps, checkpoint, mechanism timing, cargo,
falls and completion. A crew shares stamps/checkpoints and finishes when all
connected pigeons reach the exit; disconnected players never block completion.
Vanes, cargo grips, helper gusts and freight controls support cooperation while
remaining solvable by one pigeon. Refresh/late join preserve course progress.

The freight plate charges a 12-second cycle: three seconds to board, three to
rise, four at the top and two to descend. Pressing again during a cycle never
resets the lift. Cracked decks warn for about 1.3 seconds and recover 3.5 seconds
after collapsing. The vane bridge lasts 14 seconds. Gusts can turn vanes at range
or help an airborne teammate; every mechanism also has a solo route.

Gold requires no falls and a time at or below the course goal. Silver permits
three falls and 1.55 times the goal; every completion earns at least Bronze.
The course selector remembers the best medal, then the fastest time for that medal.
Checkpoints are shared, but the fall threshold follows each pigeon's last landing,
so a higher teammate cannot reset a lower one and backtracking for missed stamps
remains possible. Cargo checkpoints require the parcel nearby.

Verification includes complete ordinary-input solutions for all courses, walking
failure checks, mechanism collision/timing, host authority, late joins, persisted
room restoration, crew completion, retries and rematches. Chrome keyboard runs
complete all six courses without position-write hooks. Separate browser contexts
verify online selection/reconnect; mobile checks verify the selector and flap
controls. See `docs/testing.md` and the `evidence/trials-*.json` reports for the
current local/public run details. These are automated checks, not human playtesting.
