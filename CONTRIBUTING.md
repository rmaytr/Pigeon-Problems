# Contributing

Start with the [README](README.md), [architecture](docs/architecture.md) and
[development guide](docs/development.md). The project owner has not yet selected
a project-wide license; resolve contribution/reuse terms with the owner first.

For a bug report, include the mode/course, player count, browser/OS, input device,
steps to reproduce, expected/actual behavior and a screenshot if useful. Do not
include reconnect tickets, microphone recordings or credentials.

Keep changes focused and preserve the shared server/client simulation boundary.
For behavior changes, add regression coverage where it tests a meaningful rule.
Use the existing test runner rather than introducing a parallel framework.

Before a pull request:

```sh
npm ci
npm test
npm run docs:check
npm run build
npm run test:integration
npx playwright install chromium
npm run test:ui
```

Describe the problem, resulting behavior and verification in the PR. Distinguish
scripted browser checks from human playtesting. Do not update historical evidence
just to make it look current, commit generated screenshots, or deploy the owner's
live game as part of a normal PR.
