# Asset provenance and third-party notices

[← Project](../README.md)

## Project artwork and audio

Pigeon meshes, feather geometry, architectural models, generated surface textures,
favicon/interface artwork and synthesized game audio were created procedurally
for this project in an AI-assisted Codex workflow. There are no imported model
packs or recorded music/sound-effect libraries. See `src/pigeon-model.mjs`,
`src/materials.mjs`, `src/scenery.mjs`, `src/view.mjs` and `public/favicon.svg`.

The visual direction used grounded bird movement and clear silhouettes as design
references. No assets or code from Untitled Goose Game are included, and no
affiliation or endorsement is implied. Screenshots in `docs/assets/` and recordings
in `evidence/` show this project's actual renderer. The profile image is a model
inspection render; the other screenshots are gameplay captures.

No project-wide license has been selected by the owner. Third-party licenses
below apply to their own components and do not license the original game code/art.

## Runtime packages

| Component | Locked version | License and upstream |
|---|---|---|
| Three.js | 0.180.0 | [MIT notice](licenses/three-MIT.txt) · [upstream](https://github.com/mrdoob/three.js) |
| ws | 8.22.0 | [MIT notice](licenses/ws-MIT.txt) · [upstream](https://github.com/websockets/ws) |

The npm dependency tree is installed from `package-lock.json`. Its dependencies
retain their own copyright and license notices; do not strip bundled notices
when redistributing builds.

## Hosted fonts

The CSS requests Outfit and DM Sans through Google Fonts, with system fallbacks.
Font binaries are served externally rather than checked into this repository.

| Typeface | Copyright and license |
|---|---|
| Outfit | Copyright 2021 The Outfit Project Authors · [SIL OFL 1.1](licenses/Outfit-OFL.txt) · [source](https://github.com/google/fonts/tree/main/ofl/outfit) |
| DM Sans | Copyright 2014 The DM Sans Project Authors · [SIL OFL 1.1](licenses/DM-Sans-OFL.txt) · [source](https://github.com/google/fonts/tree/main/ofl/dmsans) |

## Development tools

Vite 7.3.7 is MIT, Playwright 1.64.1 is Apache-2.0, and Wrangler 4.152.0 is
MIT OR Apache-2.0 according to their installed package metadata. These are
development dependencies, not original project assets. Node.js, browsers,
Cloudflare and GitHub Actions have their own terms and notices. README badge
images are served by GitHub Actions and Shields.io.
