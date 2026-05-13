import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import Anthropic from "@anthropic-ai/sdk";

const CLAUDE_API_KEY = defineSecret("CLAUDE_API_KEY");

interface EventData {
  address: string;
  city: string;
  propertyType: string;
  price: number;
  rooms?: number;
  bathrooms?: number;
  size?: number;
  floor?: number;
  totalFloors?: number;
  plotSize?: number;
  gardenSize?: number;
  roofTerraceSize?: number;
  parking?: boolean;
  mamad?: boolean;
  mirpeset?: boolean;
  elevator?: boolean;
  ac?: boolean;
  renovated?: boolean;
  garden?: boolean;
  pool?: boolean;
}

interface GenerateDescriptionPayload {
  eventData: EventData;
  realtorInputText?: string;
}

const LANGUAGES = ["he", "en", "ru"] as const;
type Language = (typeof LANGUAGES)[number];

const LANG_LABEL: Record<Language, string> = {
  he: "Hebrew (עברית) — text reads right-to-left",
  en: "English",
  ru: "Russian (Русский)",
};

const PROPERTY_TYPE_LABEL: Record<string, string> = {
  apartment: "apartment",
  garden_apartment: "garden apartment (ground floor with private garden)",
  penthouse: "penthouse",
  duplex: "duplex (two-level apartment)",
  house: "private house",
  land: "plot of land",
  commercial: "commercial property",
};

function factsList(d: EventData): string[] {
  const facts: string[] = [];
  facts.push(`Type: ${PROPERTY_TYPE_LABEL[d.propertyType] ?? d.propertyType}`);
  facts.push(`Address: ${d.address}`);
  facts.push(`City: ${d.city}`);
  if (d.rooms != null) facts.push(`Rooms: ${d.rooms}`);
  if (d.bathrooms != null) facts.push(`Bathrooms: ${d.bathrooms}`);
  if (d.size != null) facts.push(`Built area: ${d.size} m²`);
  if (d.plotSize != null) facts.push(`Plot size: ${d.plotSize} m²`);
  if (d.gardenSize != null) facts.push(`Garden: ${d.gardenSize} m²`);
  if (d.roofTerraceSize != null)
    facts.push(`Roof terrace: ${d.roofTerraceSize} m²`);
  if (d.floor != null)
    facts.push(`Floor: ${d.floor}${d.totalFloors ? ` of ${d.totalFloors}` : ""}`);
  const flags: string[] = [];
  if (d.parking) flags.push("parking");
  if (d.mamad) flags.push("safe room (mamad)");
  if (d.mirpeset) flags.push("balcony");
  if (d.elevator) flags.push("elevator");
  if (d.ac) flags.push("air conditioning");
  if (d.renovated) flags.push("renovated");
  if (d.garden) flags.push("garden");
  if (d.pool) flags.push("pool");
  if (flags.length) facts.push(`Features: ${flags.join(", ")}`);
  return facts;
}

const PROMPT = (
  lang: Language,
  data: EventData,
  notes?: string
) => `You are writing a property description for a real-estate Open House listing in Israel.

Language: ${LANG_LABEL[lang]}.

Property facts (use only these, do NOT invent):
${factsList(data).map((f) => `- ${f}`).join("\n")}

${notes?.trim() ? `Realtor's own notes (use these for tone and unique points, but verify against facts): "${notes.trim()}"` : "Realtor provided no extra notes."}

Output format — EXACTLY this structure, no preamble, no section labels:

LINE 1 — A single engaging opening sentence (~12-15 words). Specific, not generic. Avoid clichés like "stunning" or "luxurious dream home".

LINE 2 — (blank line)

LINES 3-7 — Bullet list of 3-6 features. Each line starts with the most fitting single emoji from this palette:
🛋 layout / size / rooms
📍 location / neighbourhood feel
🌿 garden / outdoor / view
🅿️ parking
🛡 mamad / safe room
🛗 elevator
❄️ air conditioning
✨ renovated / move-in ready
🏊 pool
☀️ light / sun exposure
👨‍👩‍👧 family-friendly / schools nearby
⭐ unique selling point

After the emoji, a short phrase (3-8 words). No periods at end of bullet lines.

LINE 8 — (blank line)

LINE 9 — A single closing sentence inviting people to the open house. Use the phrase "Open House" (or its language equivalent). Warm, not pushy. ~10-12 words.

Tone rules:
- Warm, professional, conversational. Like a friend recommending a place.
- NEVER quote the price in the text — it appears separately in the UI.
- No exaggerations, no superlatives, no "perfect / dream / once-in-a-lifetime".
- Hebrew output: right-to-left, but emojis stay in their natural position at the START of each bullet line.
- Total length: 70-110 words.

Output the description text only.`;

export const generateDescription = onCall<GenerateDescriptionPayload>(
  { region: "europe-west1", secrets: [CLAUDE_API_KEY] },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "Sign in required");
    }
    const { eventData, realtorInputText } = request.data;
    const client = new Anthropic({ apiKey: CLAUDE_API_KEY.value() });

    const out: Record<Language, string> = { he: "", en: "", ru: "" };
    await Promise.all(
      LANGUAGES.map(async (lang) => {
        const resp = await client.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 700,
          temperature: 0.7,
          messages: [
            { role: "user", content: PROMPT(lang, eventData, realtorInputText) },
          ],
        });
        const text = resp.content
          .filter((b) => b.type === "text")
          .map((b) => (b as { text: string }).text)
          .join("\n")
          .trim();
        out[lang] = text;
      })
    );

    return { description: out };
  }
);
