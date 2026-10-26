# Deployment and hosting boundaries

[← Project](../README.md) · [Architecture](architecture.md)

## Existing live game

- [Browser client](https://pigeon-problems.smoky-harp-3438.chatgpt.site/): static
  Vite build served by OpenAI Sites.
- [Real-time service health](https://pigeon-problems-realtime.pigeon-problems.workers.dev/api/health):
  Cloudflare Worker gateway with per-room Durable Objects.

This GitHub publication does not deploy either service. The original hosting
checkout, Sites Git remote, source history and `.openai/hosting.json` identity
remain separate. The identity file is deliberately excluded from this public
copy so another developer cannot accidentally target the owner's Sites project.

The public repository starts from the release source at
`e18c51b79c36743ff62587102d63b653de567347`, plus portfolio/submission artifacts.
Source files in `src/`, `server/` and `public/` are preserved from that snapshot.
Publication changes concern documentation, test portability and verification tooling.
The original deployment history remains in its original checkout; this repository
does not pretend to reconstruct the development commit history.

## Deploying your own instance

Local development and CI need no credentials. A separate public deployment needs
your own static host and Cloudflare account. Do not deploy using another person's
project identity or overwrite their Worker.

1. Choose a unique Worker `name` in `wrangler.jsonc`. Keep its `ROOMS` binding,
   `PigeonRoom` class and initial SQLite-class migration consistent.
2. Add your frontend origin as `CLIENT_ORIGIN` in your own Worker configuration,
   for example a `vars` object containing `"CLIENT_ORIGIN": "https://your-game.example.com"`.
   Origin validation in `server/room.mjs` is also applied to requests.
3. Authenticate to your own Cloudflare account with `npx wrangler login`, review
   the target, and run `npm run deploy:server`.
4. Build the client with `VITE_SERVER_URL` set to your Worker origin, then publish
   `dist/` to your own static host over HTTPS. `.env.local` can hold this public URL.
5. Verify room creation/joining, two independent browsers, reconnection and health.

Client and backend share simulation/level code. Deploy both when shared rules
change to avoid mismatches. Wrangler may enforce provider quotas or account
requirements; this project does not enable paid plans or provision a TURN relay.

`wrangler.jsonc` retains the original Worker name for reproducibility, so choosing
your own name is a required deployment step. `VITE_SERVER_URL` is not a credential.
Never commit Cloudflare tokens, Wrangler session files or `.env.local`.

## CI and release separation

GitHub Actions builds and tests against an isolated local Node server. It receives
no Cloudflare or Sites credentials, has read-only repository permissions and runs
on ordinary pushes/pull requests. Publishing source to GitHub does not update the
hosted game. No automatic deployment workflow is configured.
