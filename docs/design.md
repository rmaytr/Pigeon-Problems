# Pigeon Problems

> Historical development/release record (October 2026). Earlier counts, art descriptions and submission details may be superseded. See [current setup](development.md), [verification](verification.md) and [README](../README.md).

A delivery company with excellent branding and no qualified employees. One dense,
sunny rooftop block; five deliveries in an 8–15 minute cooperative shift. Desktop
keyboard first, standard gamepad and touch controls also provided. Solo practice is
the same game with lighter cargo and a single switch; no pretend intelligent bot.

## Before implementation: design and technical plan

Warm low-poly 3D with a fixed-angle, locally following orthographic camera. Original
procedural geometry: rotund pigeons, caps, neck iridescence, terracotta chimneys,
striped bakery awnings, terraced gardens, laundry, giant parcels. Palette: sky
#a8dadd, ink #153b4c, postal yellow #ffcc52, roof coral #cf7967, mint #77b99b,
paper #fff9e8. Bold rounded system typography. Homepage is a live miniature rooftop
with a dispatch slip overlaid on the left, not a set of generic feature cards.

Review: use the same real game scene for the hero, so the promise matches play.
Keep cinematic motion confined to pigeons and game objects. No decorative scrolling
sections or unrelated stock images. Game HUD resembles a delivery docket, with
one current task, crew identities, stamina, contextual actions, and a route strip.

### Selected mechanics

| System | Controls and feedback | Alone / team | Combinations | Failure and recovery | 2 → 4 players | Authority |
|---|---|---|---|---|---|---|
| Shared grip & rotation | E toggles nearest marked end; R rotates; colored end rings, grip lines and effort lean | Solo mass adapts; two carriers move bulky objects faster and stabilize fragile cargo | Rotate baguette through bakery posts; brace gust-sensitive sail with a second carrier | E places gently; distant grips release; recall cargo to current checkpoint with penalty | Two physical grip slots; other crew scout, gust, catch or open route | Server checks range, height, slot availability, obstruction, carrier validity, mass and rotation |
| Throw & catch | F while gripping throws along facing; dotted ballistic aim; E near airborne parcel catches | Short solo tosses cross vents; planned teammate handoffs reach upper shelves | Throw from moving laundry lift; gust extends flight; catch prevents fragile impact | Ground bounce loses condition; fall recalls only current order; no session reset | Two form relay; up to four stage catches at successive roofs | Server computes impulse, caps throw speed, validates catches and awards one bonus per throw |
| Wing gust | Q bursts along facing; visible expanding wind rings and cooldown | Spin sign / nudge sail / give airborne friend lift | Sail cargo glides over alley; timed vent plus gust enables shortcut; gust strengthens a toss | Predictable bounded impulse, never permanent injury; 1.1s cooldown | One directs cargo, one catches; extra players can chain bursts | Server tests cone, range, cooldown and clamps velocity |

Walking and space-to-hop/hold-to-flap underpin all three systems. Limited stamina,
coyote time, jump buffering, short auto-step height, clear landing shadows. No rope:
three complementary systems provide enough depth without unstable constraints.

### Neighborhood and deliveries

1. **Probationary post**: dispatch → roof garden. A light parcel teaches walk, hop,
   grip, gentle placement and delivery. Tutorial cues disappear after actions.
2. **Bread of unusual size**: garden → bakery. Long baguette, marked grab ends,
   bakery post gap, rotate or use wider side route.
3. **Extremely normal eggs**: bakery → laundry roof. Fragile box, timed vents,
   moving laundry lift shortcut, continuous stepped side bridge safe route.
4. **A small breeze**: laundry → artist's terrace. Bulky sail, sign spinner and
   alley crossing; catch or two-carrier control; gust can open timed shortcut.
5. **Upper management**: terrace → elevated penthouse. Tall wedding cake, paired
   tap switches extend a temporary short bridge; permanent staircase around the
   back keeps disconnects recoverable. Relay throws or coordinated carry.

All delivery goals accept resting cargo only. Each completed order is a checkpoint
and cannot score twice. Dropped cargo, late joins and host departure preserve prior
deliveries. Cargo recall and personal rescue are explicit recoverable actions.
Scores itemize delivery, care, handoffs, recoveries and pace. Results offer rematch.
Only after the co-op loop is verified, add express medal mode using the same shift.

## Networking decision and build sequence

Sites' documented hosting provisions D1/R2, without a declared Durable Object
binding. Do not move 3D motion through D1 polling. Publish the Vite client separately
with Sites, and an independent Cloudflare Worker/Durable Object for each room.
The client and independent Cloudflare Worker are now deployed; see README for
their current URLs and `docs/testing.md` for release evidence. No paid plan or
other game's credentials are used. The Node/WebSocket adapter runs the exact
authoritative engine locally for development and regression checks.

1. Fixed-step shared engine + input-only WebSocket server, prove two clients move
   and grab the same object over TCP before full scene work.
2. Build procedural scene, local prediction/reconciliation, interpolation and input.
3. Author five deliveries, coherent HUD, recovery, results and session cosmetics.
4. Add invite links, expiring reconnect sessions, host migration, pings and opt-in
   WebRTC room voice (STUN, no paid TURN; report direct-connection limitation).
5. Meaningful engine tests, 2/4-client real socket sessions, browser gameplay,
   layouts, reconnect, gamepad/touch smoke, performance sample, deployment.

Server: 60 Hz fixed physics, 20 Hz snapshots, 30 Hz client input, bounded payloads,
session tokens, room caps, input timeout, per-action limits, no arbitrary position
or scoring writes. Client predicts local movement, interpolates snapshots and
reconciles against server state. Room state persists periodically in a DO; room
simulation sleeps when empty. Voice signaling is room-scoped and separate from
game authority. Session secrets stay in the joining browser's sessionStorage.

## Verification standard

Automated and scripted browser checks are not human playtesting and do not certify
fun or balance. Report public server availability separately from local evidence.
