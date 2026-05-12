import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import Anthropic from "@anthropic-ai/sdk";

const CLAUDE_API_KEY = defineSecret("CLAUDE_API_KEY");

interface GenerateDescriptionPayload {
  eventData: {
    address: string;
    city: string;
    propertyType: string;
    price: number;
    rooms: number;
    bathrooms?: number;
    size: number;
    floor?: number;
    totalFloors?: number;
    parking?: boolean;
    mamad?: boolean;
    mirpeset?: boolean;
  };
  realtorInputText?: string;
}

const LANGUAGES = ["he", "en", "ru"] as const;
type Language = (typeof LANGUAGES)[number];

const PROMPT = (
  lang: Language,
  data: GenerateDescriptionPayload["eventData"],
  notes?: string
) =>
  `Write a professional, warm property description in ${
    lang === "he" ? "Hebrew" : lang === "en" ? "English" : "Russian"
  }, ~120 words, no exaggeration, suitable for an open house listing. ` +
  `Property: ${JSON.stringify(data)}. Realtor notes: ${notes ?? "—"}. ` +
  `Output only the description text, no preamble.`;

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
          max_tokens: 600,
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
