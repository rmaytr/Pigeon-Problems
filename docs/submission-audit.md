# Submission audit — October 26, 2026

> Historical development/release record (October 2026). Earlier counts, art descriptions and submission details may be superseded. See [current setup](development.md), [verification](verification.md) and [README](../README.md).

Production audit: **84/100, launchable with caveats**. No verified technical
submission blocker remains after the fixes below. This is an engineering judgment
for the current contest game, not a prediction of judging scores or proof of fun.
The score is capped at 84 because this checkout has no configured CI and the
browser/device matrix is incomplete.

## Resolved issues

| Finding | Result | Evidence |
|---|---|---|
| A late microphone permission response could enable a stream after leaving; repeated clicks could request multiple streams. | Voice requests are deduplicated. Leaving invalidates pending requests and stops any late stream. Denial still allows retry. | Three new voice tests, including two that failed against the previous implementation. |
| Obsolete WebSocket callbacks could overwrite the current page or rejoin a room after leaving. | Replacing a connection closes the old socket. Open/message handlers ignore superseded sockets and intentional leaves. | Explicit delayed-message browser scenarios, isolated from real-network tests. |
| Hidden tabs cleared keyboard keys but retained held touch input. | Blur, visibility, reconnect, leave and menu entry clear controls. Hidden pages send neutral input and never sample gamepad actions. | Touch hold, hide/return and pointer-cancel browser checks. |
| Trial mode omitted the microphone status and Leave voice control available in deliveries. | Both HUDs share voice/status/menu controls. | Actual browser voice enable/leave with fake microphone media. |
| Small-screen recovery depended on discovering the home logo, and a 320-pixel HUD prompt overlapped crew controls. | Visible Menu button; constrained prompt width and separated stamina/crew panels. | 320-pixel geometry assertions and screenshot inspection. |
| Enter did not submit the create/join inputs. | Both forms accept Enter. A failed creation leaves the form retryable. | Browser create outage/retry and create/join keyboard checks. |
| Pigeon Problems lacked a dedicated submission package. | Original game screenshot, 366-character description, clean URL and judge walkthrough prepared in `submission/`. | Cover inspected at 1600 by 900; description length checked. |

## Evidence checked

- Clean published version 6 source (`81b2a6ed90633698892ed29134ad5e8ad305ec17`)
  was synchronized before editing. Existing Sites identity and public audience
  are retained; the other two games are untouched.
- **62 engine/session/voice tests** pass. Their routes complete all six trials
  with solo and four-pigeon normal inputs, plus the original delivery shift.
- **20 delivery/multiplayer browser checks**, **15 art/aim/input checks**, **13
  trial UI checks** and **17 release-edge checks** pass in installed Chrome.
  Reports are in `evidence/*-results.json`. HTTP outage and obsolete-socket cases
  are explicitly injected, not mislabeled as observed production failures.
- The public Worker passes real two/four-client synchronization, grip ownership,
  identity recovery, host transfer and input validation. A real WebSocket proxy
  adds **300 ms round-trip latency** and verifies movement, stale-input stopping
  and checkpoint rescue. These were rerun for this audit.
- Public `/api/health` returns 200 for the game origin and 403 for an unrelated
  browser origin. Room/action/voice authority, session secrecy and saved-state
  restoration were inspected in the source and exercised by tests.
- No tracked environment or Wrangler credential files were found. A focused
  source scan found no private-key blocks or obvious API-key literals. This is
  not a third-party penetration test or dependency-advisory certification.
- The prior release's full solo keyboard and public 2/4-player six-course runs
  remain documented in `docs/testing.md`; this revision does not change course
  geometry, physics or server code.
- The production client is built and published through the existing Sites source
  workflow. The independent Worker remains version
  `94993870-fcc4-4eb5-88b6-fc5850373644`.

## Remaining before you submit

1. **Do one real 2-4 person playtest**, preferably with a newcomer and separate
   phones/laptops. Test onboarding without explanations, comfortable landings,
   cooperative carrying, refresh/rejoin, checkpoint recovery and one rematch.
   Ask whether players understood what went wrong and wanted another round.
2. **Check the live mission and submit through your account.** The prepared title,
   cover, description and public URL are in `submission/submission-copy.md`.
   Confirm its current fields, deadline, eligibility and terms. No entry or terms
   acceptance has been performed by the agent.

No additional levels or major feature work is recommended before that playtest.
Use its findings to make small fixes rather than widening the game.

## Evidence limits and optional follow-up

- Actual iOS Safari, Android hardware, Firefox and physical controllers are not
  fully verified. Touch/gamepad checks use Chrome emulation and a simulated pad.
- Direct voice uses STUN without TURN. Restrictive networks may prevent voice;
  pings and gameplay remain independent. No paid service is enabled.
- Short local rendering samples are about 60 fps on this machine. Sustained load,
  free-tier quota headroom and a geographically distributed human session are
  not certified. There is no continuous uptime monitor or CI configured here.
- A new external audit service was not used, and no source or secrets were sent
  to one. No new dependencies were introduced for this audit.

## Rollback and recovery

If the client update regresses, redeploy the saved Sites version 6:
`appgprj_6adda5e65c488191a31d5b25a62fac51~appgver_8f4b0079554c8191b96b956ce0776957`.
It matches source `81b2a6ed90633698892ed29134ad5e8ad305ec17`. Leave the independent
Worker unchanged; this audit adds no migrations or backend changes. This recovery
path is documented from saved release metadata, not exercised against live users.
Do not reset or delete active rooms to roll back the static client.
