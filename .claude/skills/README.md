# OpenHouseMap project skills

Local Claude Code skills scoped to this repo. Used by Claude during sessions automatically (via the Skill tool) whenever the description matches the user's intent.

| Skill | When Claude should reach for it |
|---|---|
| **openhouse-deploy** | After firestore/storage rules or front-end code changes — deploy via Firebase CLI (rules) or git push (Vercel rebuild) |
| **openhouse-seed** | Running `tools/seed-*.ts` admin scripts: seed events, photos, hebrew addresses, clean test data |
| **openhouse-geocode** | Verifying or debugging `/api/geocode` — data.gov.il + Nominatim + Photon pipeline |
| **openhouse-rsvp-debug** | Star ⭐ / RSVP (אגיע/אולי/לא) buttons not toggling — applies the stateRef + optimistic pattern |
| **openhouse-mobile-test** | iPhone 17 Pro (393×852) playwright recipes — sheet, popup, lightbox, photo upload, drag handle |

These are auto-discovered. Edit/add a new `.md` file with YAML frontmatter to expose another skill:

```md
---
name: my-skill
description: When Claude should use this (used for trigger matching)
---

# Body — instructions Claude follows when the skill is invoked
```
