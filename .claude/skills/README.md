# OpenHouseMap project skills

Local Claude Code skills scoped to this repo. Auto-discovered each session.

## Project-specific (custom)

| Skill | When Claude reaches for it |
|---|---|
| **openhouse-deploy** | After firestore/storage rules or front-end changes — Firebase CLI for rules, git push for Vercel |
| **openhouse-seed** | Running `tools/seed-*.ts` admin scripts: seed events, photos, hebrew addresses, clean test data |
| **openhouse-geocode** | Verify/debug `/api/geocode` — data.gov.il + Nominatim + Photon pipeline |
| **openhouse-rsvp-debug** | Star ⭐ / RSVP (אגיע/אולי/לא) buttons not toggling — applies the stateRef + optimistic pattern |
| **openhouse-mobile-test** | iPhone 17 Pro (393×852) Playwright recipes — sheet, popup, lightbox, drag handle |

## Official Anthropic skills (copied from anthropics/skills@main)

| Skill | Source | Why for this project |
|---|---|---|
| **frontend-design** | `skills/frontend-design/` | Production-grade UI components, design quality — used for popup, gallery, lightbox, sheet, dashboard polish |
| **webapp-testing** | `skills/webapp-testing/` | Playwright recipes for local + production e2e — already used for iPhone mobile flow |
| **claude-api** | `skills/claude-api/` | We call Claude Haiku via `httpsCallable<generateDescription>` Cloud Function. This skill covers prompt caching, model version migrations, SDK usage |
| **skill-creator** | `skills/skill-creator/` | Author additional project-specific skills as the codebase grows (e.g. cron / scheduler skills when we wire post-event automation) |

License: each official skill ships with its own `LICENSE.txt` from Anthropic.

## Authoring a new skill

```md
---
name: my-skill
description: One sentence — Claude matches user intent against this string
---

# Body

Instructions Claude follows when invoked.
```

Save as `.claude/skills/my-skill.md` or `.claude/skills/my-skill/SKILL.md`. Auto-discovered on next session.

## Source

```bash
git clone --depth=1 https://github.com/anthropics/skills /tmp/anthropic-skills
cp -R /tmp/anthropic-skills/skills/<name> .claude/skills/
```

Updates: re-clone and re-copy. Skills are versioned by `git pull` on the upstream.
