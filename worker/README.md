# Verixa outreach worker

Local Node + Playwright process that executes LinkedIn and X tasks for Verixa and reads replies (LinkedIn, X, IMAP). Verixa decides who and what to send; the worker only executes and reports. Design: `docs/superpowers/specs/2026-11-05-consultant-outreach-design.md`, sections 6 to 8.

## Setup

```bash
cd worker
npm install            # does not download browsers; the worker drives your installed Google Chrome
cp .env.example .env   # then fill it in
```

| Variable | Meaning |
|---|---|
| `VERIXA_BASE_URL` | e.g. `https://www.getverixa.com` |
| `OUTREACH_WORKER_TOKEN` | same value as the server's `OUTREACH_WORKER_TOKEN` |
| `IMAP_HOST`, `IMAP_PORT`, `IMAP_USER`, `IMAP_PASS` | the founder inbox (use an app password) |
| `OPERATOR_TZ` | default `America/Toronto` |
| `PROFILE_DIR` | Chrome profile folder holding the logged-in sessions, e.g. `./.profile` |

`.env`, `.profile/` and `.state/` are git-ignored. Never commit them.

## First-time login (manual, once per site)

```bash
npm run login -- linkedin
npm run login -- x
```

A Chrome window opens. Sign in yourself (2FA included), then press Enter in the terminal. No credentials are read or stored by this code.

## Probe (read-only selector check)

```bash
npm run probe -- linkedin
npm run probe -- x
```

Prints a PASS/FAIL table. Nothing is clicked that sends, connects or messages. Run it once per site before the first real run, and again whenever a site changes. A FAIL means the adapter would stop that channel with `ADAPTER_BROKEN`.

## Running

```bash
npm run work                   # one full pass: discover, run tasks, inbox, email replies, heartbeat
npm run work -- --dry-probe    # prints what would run; no browser, no task fetch
```

Keep `outreach.dryRun` on in the Verixa dashboard for the first days. In dry-run the worker still matches profiles and reads inboxes but sends nothing.

Rules the worker enforces: the kill switch is re-checked before every action; it only acts Mon to Thu 08:00 to 13:00 Toronto time; 5 to 13 minute random gaps; at most 5 actions per channel per day; the thread is checked for the exact text before any send; a checkpoint, captcha or login wall stops the channel at once.

Exit codes: `0` ok, `1` error, `2` a channel was halted, `3` another run is active, `4` bad worker token.

## Schedule (launchd)

```bash
./scripts/install.sh
```

Installs a job for Mon to Thu at 08:05 under `caffeinate -i`. Logs go to `.state/logs/`. The script prints the wake line for you to run yourself:

```bash
sudo pmset repeat wakeorpoweron MTWR 07:55:00
```

Uninstall: `./scripts/install.sh --uninstall` (and `sudo pmset repeat cancel` if you set the wake).

## Recovering from a halt

A halt turns the channel off in Verixa and emails you.

1. `CHECKPOINT`: open the worker's Chrome (`npm run login -- linkedin|x`), clear the challenge, sign in again if needed.
2. `ADAPTER_BROKEN`: the report names a screenshot in `.state/shots/`. Run `npm run probe -- <site>` to see which selector failed. Fix the adapter; never retry by hand.
3. Re-enable the channel in `/dashboard/admin/outreach`.

If a run crashed mid-send, nothing special is needed: the next run finds the touch still queued, checks the thread for the exact text and reports SENT without resending.

State files: `.state/state.json` (IMAP position, action log), `.state/run.lock`. A stale lock (dead process or older than 6 hours) is taken over automatically.
