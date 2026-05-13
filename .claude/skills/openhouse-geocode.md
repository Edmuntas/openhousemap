---
name: openhouse-geocode
description: Verify / debug the /api/geocode endpoint that powers the AddressPicker. Use after geocode changes or when users report wrong autocomplete results.
---

# Test /api/geocode

The Israeli address autocomplete pipeline:
1. **Hebrew query** → data.gov.il streets dataset (`9ad3862c-8391-4b2f-84a4-2d4c68625f4b`) is the primary source
2. **Coord resolution** → Nominatim with `accept-language=he`, cached 1 week
3. **Latin query** → Photon + Nominatim fallback

## Endpoints

```
GET /api/geocode?q=<text>&type=city
GET /api/geocode?q=<text>&type=address&city=<canonical>&near=<lat>,<lng>
```

## Smoke tests (Hebrew)

```bash
echo "=== city: פרדס חנה ==="
curl -s "https://www.openhousemap.online/api/geocode?q=%D7%A4%D7%A8%D7%93%D7%A1%20%D7%97%D7%A0%D7%94&type=city" \
  | python3 -c "import json,sys; [print(f'  {f[\"place_name\"]} | {f[\"center\"]}') for f in json.load(sys.stdin).get('features',[])[:5]]"

echo "=== address: רוטשילד 22 in 'תל אביב - יפו' ==="
curl -s "https://www.openhousemap.online/api/geocode?q=%D7%A8%D7%95%D7%98%D7%A9%D7%99%D7%9C%D7%93%2022&type=address&city=%D7%AA%D7%9C%20%D7%90%D7%91%D7%99%D7%91%20-%20%D7%99%D7%A4%D7%95&near=32.0853,34.7818" \
  | python3 -c "import json,sys; [print(f'  {f[\"place_name\"]}') for f in json.load(sys.stdin).get('features',[])[:5]]"
```

Expected: hebrew-only results, short form `"שדרות רוטשילד 22, תל אביב - יפו"` (not the verbose `"22, ..., מחוז תל אביב, 6688512, ישראל"` Nominatim default).

## Smoke tests (Latin)

```bash
curl -s "https://www.openhousemap.online/api/geocode?q=zikhron%20yaakov&type=city" | jq '.features[0].place_name'
```

## Pitfalls

- **City names have hyphens / trailing spaces** in data.gov.il (`"תל אביב - יפו"` not `"תל אביב"`). The UI must pass the canonical name returned from a previous `type=city` call back when querying addresses, or the city filter fails to match.
- **HEBREW_RE** = `/[֐-׿]/` regex. Used to detect Hebrew text and route to data.gov.il pipeline.
- Nominatim has a 1 req/sec policy; we use User-Agent + Next.js `revalidate: 604800` (7-day cache) to stay within limits.

## File

`app/api/geocode/route.ts` — all logic. Three async helpers:
- `ilCities(q)` — data.gov.il city search
- `ilAddresses(q, city)` — data.gov.il streets filtered by exact city
- `photonGeocode` + `nominatimGeocode` — Latin fallback

## Live changes via Vercel

After edits push to main; the API is `force-dynamic` so cache invalidates on deploy.
