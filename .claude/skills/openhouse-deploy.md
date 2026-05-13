---
name: openhouse-deploy
description: Deploy OpenHouseMap changes — firestore.rules / storage.rules go to Firebase; everything else goes through Vercel via git push. Use whenever rules or front-end code has changed and the user wants it live.
---

# Deploy OpenHouseMap

## Code (Next.js, Cloud Functions UI usage)

Vercel auto-deploys on every push to `main`. Workflow:

```bash
git add -A
git commit -m "<commit message>"
git push
```

Then wait ~90–120s for Vercel rebuild. Confirm a specific change shipped by grepping the new JS bundle:

```bash
for chunk in $(curl -s https://www.openhousemap.online/ | grep -oE '/_next/static/chunks/[^"]*\.js' | sort -u); do
  if curl -s "https://www.openhousemap.online${chunk}" 2>/dev/null | grep -q "<unique-string-from-new-code>"; then
    echo "shipped: $chunk"; break;
  fi
done
```

## Firestore rules / indexes

```bash
firebase deploy --only firestore:rules --project openhousemap
firebase deploy --only firestore:indexes --project openhousemap
```

Rules update is instant (no Vercel rebuild).

## Storage rules

```bash
firebase deploy --only storage --project openhousemap
```

Used previously to allow admin upload (was: only verified realtor).

## Cloud Functions

```bash
firebase deploy --only functions --project openhousemap
```

Functions live in `functions/` directory. Required env: CLAUDE_API_KEY (set via `firebase functions:secrets:set CLAUDE_API_KEY`).

## Both at once

```bash
firebase deploy --project openhousemap
```

## Env vars on Vercel

Project is linked via `.vercel/`. List/add through:

```bash
vercel env ls
vercel env add MAPBOX_SECRET_KEY production
```

Production domain: https://www.openhousemap.online (Vercel)
Firebase project: `openhousemap`
