/**
 * Build data/il-cities.json — list of all Israeli municipalities (canonical
 * hebrew names) from data.gov.il streets dataset. Used by /api/geocode for
 * instant prefix-matching of city autocomplete (hebrew prefix search via the
 * remote dataset's full-text index misses partial inputs like "חדר").
 *
 * Run once whenever the source dataset is updated:
 *   npx tsx tools/build-cities-list.ts
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const STREETS_RESOURCE_ID = "9ad3862c-8391-4b2f-84a4-2d4c68625f4b";
const PAGE_SIZE = 1000;

interface Record {
  סמל_ישוב: number;
  שם_ישוב: string;
}

async function fetchPage(offset: number): Promise<Record[]> {
  const url =
    `https://data.gov.il/api/3/action/datastore_search` +
    `?resource_id=${STREETS_RESOURCE_ID}` +
    `&limit=${PAGE_SIZE}&offset=${offset}` +
    `&fields=סמל_ישוב,שם_ישוב`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const data = await resp.json();
  return (data?.result?.records ?? []) as Record[];
}

async function main() {
  const byCode = new Map<number, string>();
  let offset = 0;
  let total = 0;
  while (true) {
    let records: Record[];
    try {
      records = await fetchPage(offset);
    } catch (e) {
      console.log(`\n  fetch failed at offset ${offset} (${(e as Error).message}); saving what we have`);
      break;
    }
    if (!records.length) break;
    for (const r of records) {
      if (r.שם_ישוב && r.סמל_ישוב) {
        byCode.set(r.סמל_ישוב, r.שם_ישוב.trim());
      }
    }
    total += records.length;
    offset += PAGE_SIZE;
    process.stdout.write(`  ${total} rows scanned, ${byCode.size} unique cities\r`);
    if (records.length < PAGE_SIZE) break;
  }
  console.log(`\n  done — ${byCode.size} cities collected from ${total} street records`);

  const cities = [...byCode.entries()]
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => a.name.localeCompare(b.name, "he"));

  mkdirSync("data", { recursive: true });
  writeFileSync("data/il-cities.json", JSON.stringify(cities, null, 2), "utf8");
  console.log(`written: data/il-cities.json (${cities.length} cities)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
