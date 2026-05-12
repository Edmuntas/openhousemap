import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import Anthropic from "@anthropic-ai/sdk";

const CLAUDE_API_KEY = defineSecret("CLAUDE_API_KEY");

interface SocialPostPayload {
  eventId: string;
  languages: ("he" | "en" | "ru" | "fr" | "ar")[];
}

// Stub — full implementation generates caption per language for social templates.
export const generateSocialPost = onCall<SocialPostPayload>(
  { region: "europe-west1", secrets: [CLAUDE_API_KEY] },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "Sign in required");
    }
    const { languages } = request.data;
    const client = new Anthropic({ apiKey: CLAUDE_API_KEY.value() });

    const captions: Record<string, string> = {};
    await Promise.all(
      languages.map(async (lang) => {
        const resp = await client.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 200,
          messages: [
            {
              role: "user",
              content: `Write a short social media caption in ${lang} for an open house event. 1-2 sentences, with emoji.`,
            },
          ],
        });
        captions[lang] = resp.content
          .filter((b) => b.type === "text")
          .map((b) => (b as { text: string }).text)
          .join("\n")
          .trim();
      })
    );
    return { captions };
  }
);
