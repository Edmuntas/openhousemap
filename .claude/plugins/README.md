# OpenHouseMap project — relevant plugins

Plugins are installed at the **user scope** (`~/.claude/plugins/`), but this file documents which of them are actively useful for this repo and how Claude uses each. If a teammate clones the project, install the same set so the same workflows work.

## Install (one-time, user-scope)

In Claude Code, run:

```
/plugin install commit-commands@claude-plugins-official
/plugin install code-review@claude-plugins-official
/plugin install code-simplifier@claude-plugins-official
/plugin install firebase@claude-plugins-official
/plugin install github@claude-plugins-official
/plugin install frontend-design@claude-plugins-official
/plugin install playwright@claude-plugins-official
/plugin install notion@claude-plugins-official
/plugin install feature-dev@claude-plugins-official
/plugin install claude-md-management@claude-plugins-official
/plugin install security-guidance@claude-plugins-official
/plugin install skill-creator@claude-plugins-official
/plugin install superpowers@claude-plugins-official
```

## Why each one matters for OpenHouseMap

| Plugin | Role in this repo |
|---|---|
| **firebase** | Direct `mcp__plugin_firebase_*` calls — read/update Firestore docs, deploy rules+functions, manage Auth custom claims (used to grant admin to Edmont) |
| **github** | Branch/PR management; check CI; create issues for known bugs (UI-8 phone OTP etc.) |
| **playwright** | iPhone 17 Pro mobile emulation for e2e — see `.claude/skills/openhouse-mobile-test.md` |
| **frontend-design** | Design polish for popup / lightbox / bottom sheet (`/skill frontend-design ...`) |
| **commit-commands** | `/commit`, `/commit-push-pr` — uniform commit style with Co-Authored-By trailer |
| **code-review** | `/review <pr>` before merging non-trivial changes |
| **code-simplifier** | Cleanup pass after big features (RSVP, dashboard tabs, photo gallery) |
| **notion** | Project plan + Decision Log lives in Notion workspace `openhousemap.online` — Claude can query/create pages |
| **feature-dev** | Multi-step features (e.g. when phone-OTP registration finally lands) |
| **claude-md-management** | Keep CLAUDE.md in sync — run after every major feature pass |
| **security-guidance** | Firestore rules audits before launch |
| **skill-creator** | Author new project skills (this directory will grow) |
| **superpowers** | Brainstorming + writing-plans + executing-plans skills used for big features |

## Project-only skills

See `.claude/skills/` — those are repo-local and auto-loaded by Claude Code regardless of plugin install status.

## Currently NOT enabled (irrelevant for this repo)

`youtube-search`, `youtube-analysis`, `notebooklm-*`, `fb-pending-review` — these belong to other projects (PhotoDesk, SkyTask, Hebrew real-estate research notebooks). Leave them user-scope, but don't reference them here.
