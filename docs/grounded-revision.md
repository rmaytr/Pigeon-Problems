# Grounded neighborhood revision — October 26, 2026

> Historical development/release record (October 2026). Earlier counts, art descriptions and submission details may be superseded. See [current setup](development.md), [verification](verification.md) and [README](../README.md).

Reference: House House's official Untitled Goose Game presentation at
https://goose.game/ . Use its clear silhouettes, broad color fields and grounded
animal motion as a visual/movement reference; all pigeon models, scenery and
materials remain original.

Replaced the printed-card treatment, heavy outlines, noisy grain and oversized eye/
hat details with smoothly shaded bird anatomy, crisp material-specific paving,
plaster, wood and fabric, richer controlled color, broad soft light and quiet
background detail. Palette: slate #60758a, chalk #eee9dc, terracotta #c47d69,
foliage #799878, duck egg #94b9bb, postal yellow #e8bc55. Keep typography and
camera framing familiar; put detail into the world and character silhouette.

Body heading follows locomotion only. The head, beak, gust and throw direction
share a server-validated ±65 degree look limit relative to body heading. Feet
plant during stance, lift during swing and tuck during flight. Weight transfer,
head stabilization, wing recovery and landings are damped and restrained.

Center-position carrying is replaced by a constrained load model. One beak grip
supports one end; gravity creates pitch torque, the far end contacts/drag along
the floor, and contact adds movement resistance. Two carriers support both ends.
Drops keep orientation and momentum; free load contact and throw preview share
the same fixed-step integration. Limits keep impulses and recovery bounded.
This is a purpose-built constrained rigid-load solver, not a general rigid-body
engine. Permanent back bridges sit farther from the bakery posts,
giving the longer, tilted cargo enough room to turn. All five deliveries remain
recoverable in solo and online play.

Verification covers body/head limits, dragging, corner/floor contact, helper joins/
releases, preview consistency, full input-driven solo and 2/4-client delivery routes,
and actual browser movement/animation. See [the verification record](testing.md).
`evidence/grounded-demo.webm` records actual rendered walking, head look, takeoff
and landing while carrying a baguette. The recording uses ordinary keyboard/mouse
input and canvas capture; it is not a rendered mock-up.
