# Neighborhood and pigeon model revision

> Historical development/release record (October 2026). Earlier counts, art descriptions and submission details may be superseded. See [current setup](development.md), [verification](verification.md) and [README](../README.md).

The visual focus is an original, inhabited European rooftop postal neighborhood.
The earlier scene repeated large rectangular blocks; the pigeon used conspicuous
ellipsoids and stubby wing feathers. Replace those forms, not just their colors.

Palette: blue slate #64788c, zinc #647e85, limestone #dddbca, old brick #bd8572,
garden green #698777, and mail yellow #e8bc55. Keep the existing interface fonts
and layout. Warm direct sunlight, cool skylight and grounded contact shadows give
the smooth forms definition. Texture describes material at a consistent scale.

The character is the focal point: continuous pear-shaped torso, tapered neck,
sculpted beak/cere, small amber eyes, metallic green/violet neck sheen, overlapping
coverts, two dark wing bars, pointed primaries, a fan tail and curved toes. Folded
and extended wings have different anatomically authored silhouettes. Preserve the
existing server-validated head limits, beak height, movement and load physics.

Architecture has three scales: readable roof destinations; recessed facade bays,
cornices, gutters, downpipes and iron balconies; varied townhouses and mansard/gable
roofs beyond the route. A street, pavements, planted trees, shopfronts and courtyard
details anchor the buildings below. Background contrast decreases with distance.
Keep the walkable route clear and retain the existing collision geometry.

Review at gameplay camera distance, in a character close-up, at both ends of the
neighborhood, and on mobile. Batch static architectural meshes by material. Check
frame cost with cargo/preview active, head limits, carrying and flight, online
synchronization, and the five-delivery solo route before publishing.

Implemented: contour-built body and head, tapered mandibles/cere, small eyes,
iridescent neck, two wing bars integrated into the wing material, overlapping
primaries, curved toes/claws and a small courier satchel. The folded and flying
silhouettes blend during takeoff/landing. Normals are smoothed across the UV seam.

Buildings now reach the street and have recessed window frames, varied shutters,
iron balconies, sill/cornice courses, downpipes, slate gables, zinc mansards and
dormers. Streets include shop awnings, lamps and trees. A greenhouse, bakery
display, softly moving cloth, original terrace paintings and a glazed penthouse
rooflight give the destinations separate identities. Material maps include subtle
bump relief and roof UV scaling so shingles read at an architectural scale.
Header/caption surfaces keep text readable over the richer background.

See [verification](testing.md), `tests/model-studio.mjs` for model views,
`tests/art-performance.mjs` for reproducible frame samples, and
`evidence/grounded-demo.webm` for actual gameplay movement/carrying capture.
