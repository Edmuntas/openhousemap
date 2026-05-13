---
name: openhouse-rsvp-debug
description: Debug recipe for RSVP / Favourite toggle bugs (state not flipping, third tap doesn't work, button visually disabled). Use whenever the user reports any star ⭐ or RSVP אגיע/אולי/לא button not responding.
---

# Debug RSVP / Favourite toggles

## Pattern of bug

User taps once — toggles on. Taps again — toggles off. Third tap — nothing happens.

## Root cause (already fixed once)

`toggle()` read state from the React render closure. Between rapid taps, the snapshot listener for the just-deleted doc hadn't fired yet, so the next render still saw the stale value and the next tap branched into the wrong path.

## Fix template (apply this whenever you add another doc-toggle hook)

```ts
const [state, setState] = useState(initial);
const stateRef = useRef(state);
stateRef.current = state;

useEffect(() => {
  const unsub = onSnapshot(ref, (snap) => {
    const v = mapSnapToState(snap);
    setState(v);
    stateRef.current = v;
  });
  return unsub;
}, [...]);

async function toggle() {
  const wasState = stateRef.current;
  // Optimistic flip — UI reacts instantly
  setState(next);
  stateRef.current = next;
  try {
    await firestoreWrite(...);
  } catch (e) {
    // Revert on real failure
    setState(wasState);
    stateRef.current = wasState;
    throw e;
  }
}
```

Files using this pattern:
- `hooks/useFavourite.ts`
- `hooks/useRsvp.ts`

## Button side

```tsx
<button
  onClick={(e) => {
    e.stopPropagation();        // not consumed by drag handle / popup container
    handler();
  }}
  aria-pressed={active}
  aria-busy={loading}            // NOT disabled — keep clickable while sub resolves
  style={{ touchAction: "manipulation" }}  // no 300ms mobile tap delay
  className="... active:scale-95"          // visual feedback so user knows tap registered
>
```

NEVER set `disabled={loading}` on these toggle buttons — the loading state from the snapshot subscription is sometimes briefly true and locks the button.

## Firestore rules

Both `/rsvp/{id}` and `/favourites/{id}` must allow `(verifiedRealtor || admin)` for create/update/delete. `firestore.rules` already has this; if you add another role, update.

## Verify deploy

After fixing, grep the production bundle for the new state-ref pattern:

```bash
for chunk in $(curl -s https://www.openhousemap.online/ | grep -oE '/_next/static/chunks/[^"]*\.js' | sort -u); do
  if curl -s "https://www.openhousemap.online${chunk}" | grep -q "stateRef.current"; then
    echo "shipped: $chunk"; break;
  fi
done
```
