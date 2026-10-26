# Handmade postal diorama update

> Historical development/release record (October 2026). Earlier counts, art descriptions and submission details may be superseded. See [current setup](development.md), [verification](verification.md) and [README](../README.md).

Historical October 25 direction. The October 26
[grounded revision](grounded-revision.md) supersedes its printed-card materials,
large outlines, unrestricted mouse look and wing-based carrying poses.

The new visual identity is a tiny city built from printed card, painted wood and
delivery stationery. Keep the existing ink/yellow identity; spend the visual
detail on the actual world rather than adding interface decoration.

Palette: postal ink #183e50, butter paper #fff2cc, roof red #bd715e, oxidized
teal #4c8c91, garden sage #8fac7b, sunrise peach #edbc9d. Existing Outfit/DM Sans
typography remains. Preserve the locally following camera and uncluttered HUD.

Materials: original deterministic canvas textures for paper grain, irregular
printed bricks, roof tiles, woven fabric, wood and feathers. Buildings get fine
ink edges, layered cornices, pasted postal motifs, water tanks and aerials. Rooftops
get painted delivery routes and destination symbols. Background buildings gain
brickwork, window variation and silhouettes; distant detail stays lower contrast.

Pigeons: articulated head/neck, shoulder pivots and feathered wing tips; distance
based walking cadence and head stabilization; push-off stretch, strong downstroke,
slower recovery, glide pose, bank, tucked feet and landing compression. Carriers
lean into weight and reach a wing toward the actual marked grip. Short catch,
throw and gust reactions add readable follow-through. Reduced motion keeps the
essential pose changes while suppressing bobbing, banking and rapid wing cycles.

Aiming: movement and aim are independent. Mouse projects onto visible roof tops;
head follows the cursor, throw/gust direction uses continuous angles. Cursor
distance selects a bounded throw speed. Hold left mouse to line up, release to
throw; F also throws instantly. Right mouse or Q gusts. A trajectory and landing
stamp use the same validated launch parameters as the server. Gamepad right stick
aims continuously; touch supports dragging the Throw button and releasing. Walking
direction remains the keyboard-only fallback. No new paid assets or dependencies.

Review: this is specific to an unqualified postal crew, retains 3D readability,
and makes the visual upgrade serve handling and aiming. Avoid a generic film grain
overlay across text: texture belongs to world materials. Keep collision geometry
and the five delivery routes unchanged.

Verification: authoritative angle/power validation, aim independent of walking,
preview vs actual throw, browser mouse/stationary aiming and head tracking,
network replication, touch/gamepad mappings, existing full-shift routes, screenshots,
frame sample and public deployment.
