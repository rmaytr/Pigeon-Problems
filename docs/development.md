# Development

[← Project](../README.md) · [Verification](verification.md) · [Deployment](deployment.md)

## First run

Install Node.js 24+ and npm. `.nvmrc` selects Node 24 if your version manager
supports it. Run from this repository's root:

```sh
npm ci
npm run dev
```

Visit `http://127.0.0.1:5173`. Node serves both the Vite frontend and authoritative
WebSocket rooms. There is no cloud login, secret, migration or database setup.
Create a crew in one browser and join its invitation from another. Restarting the
development server resets room state. Solo practice also runs locally.

`.env.local` is optional. Vite loads `VITE_SERVER_URL` for a separate backend.
Without it, localhost uses the local same-origin server. `PORT` is read directly
from the Node environment, not automatically loaded from `.env.local`.

| Setting | Default | Use |
|---|---|---|
| `PORT` | `5173` | Local HTTP/WebSocket port; HMR uses port + 20000 |
| `VITE_SERVER_URL` | Same origin locally; existing public service on other hosts | Public build-time backend origin |
| `CLIENT_ORIGIN` | Existing game origin plus allowed localhost origins | Production Worker variable for your own client |
| `CLIENT_URL` / `TEST_URL` | Localhost in published test scripts | Browser / WebSocket test target |
| `BROWSER_CHANNEL` | `chrome` in individual scripts | `chromium` for Playwright's downloaded browser |
| `NO_REPORT` | Unset | `1` prevents test scripts overwriting saved JSON evidence |
| `CREW_SIZE` | Suite dependent | Two or four clients in full-shift/trial network pilots |
| `COURSES` | All six | Comma-separated trial IDs for route scripts |

`VITE_*` is public configuration. Cloudflare authentication belongs to your own
Wrangler login or deployment environment; do not add tokens to this repository.

## Commands

```sh
npm test
npm run docs:check
npm run build
npm run test:integration
npx playwright install chromium
npm run test:ui
```

The managed integration/UI runners own their local server, wait for its health
endpoint and stop it on completion or failure. They require the chosen port to be
free and set both test URLs to that local server. UI defaults to bundled Chromium;
set `BROWSER_CHANNEL=chrome` to use installed Chrome instead.

To run an individual script against an already-running server in PowerShell:

```powershell
$env:CLIENT_URL = 'http://127.0.0.1:5173'
$env:TEST_URL = 'http://127.0.0.1:5173'
$env:NO_REPORT = '1'
node tests/browser.mjs
node tests/trials-browser.mjs
$env:CREW_SIZE = '4'
node tests/trials-network.mjs
```

In a POSIX shell, use `CLIENT_URL=http://127.0.0.1:5173 NO_REPORT=1 node tests/browser.mjs`.
For another local port, set `PORT` before `npm run dev` and point both URLs to it.
Do not run multiple managed runners simultaneously on the same port.

## Build and hosting

`npm run build` writes static assets into `dist/`. `npm run preview` previews those
files; it does not start the local authoritative room adapter. Use the development
server for offline/local multiplayer, or point a production build at your own
deployed backend. See [deployment](deployment.md).

## Troubleshooting

- **Port in use:** stop the process you own, or choose another `PORT`. The managed
  runner refuses to attach its tests to an unrelated server.
- **Browser executable missing:** run `npx playwright install chromium`. On Linux,
  use `--with-deps` for system libraries. Individual scripts default to Chrome;
  set `BROWSER_CHANNEL=chromium` if that is the browser you installed.
- **WebGL unavailable:** enable hardware acceleration/use a WebGL-capable browser.
  CI uses software WebGL and a 0.25 device pixel ratio, preserving CSS layout sizes;
  its frame rate is not a benchmark. Local runs retain normal device pixel ratio.
- **Room connection fails:** use `npm run dev`, check the health endpoint at
  `/api/health`, and remove an unintended `VITE_SERVER_URL` override.
- **Fonts unavailable:** hosted Google Fonts fall back to system fonts. Browser
  smoke checks do not require the font service to be reachable.
- **Voice unavailable:** localhost is allowed for microphone access; remote hosts
  need HTTPS. Microphone permission and NAT/firewall restrictions can prevent
  voice. Pings and game networking remain usable without it.
- **Windows child-process restrictions:** the core command uses
  `--test-isolation=none`. It preserves assertions while avoiding isolated test
  child-process spawning in restricted environments.
