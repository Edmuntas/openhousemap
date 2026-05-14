/**
 * City → landmark prompt mapping for AI-generated share card backgrounds.
 * Used by /api/share-card endpoint when FAL_KEY is configured.
 */
const LANDMARKS: Record<string, string> = {
  "תל אביב - יפו":
    "Bauhaus White City architecture and palm trees, mediterranean golden hour, Tel Aviv skyline",
  "תל אביב":
    "Bauhaus White City architecture and palm trees, mediterranean golden hour, Tel Aviv skyline",
  ירושלים:
    "ancient Jerusalem stone walls and golden dome, warm sunset light, old city architecture",
  חיפה:
    "Baha'i Gardens terraces overlooking Haifa bay from Mount Carmel, mediterranean sea view",
  "באר שבע":
    "Negev desert dunes meeting modern Israeli architecture, warm sand tones",
  "ראשון לציון":
    "modern coastal Tel Aviv metro skyline with mediterranean palm avenue",
  "פתח תקווה":
    "modern central Israeli urban skyline at golden hour, palm trees",
  "רמת גן":
    "Diamond Exchange district modern towers at sunset, urban Israel",
  "זכרון יעקב":
    "old stone houses, vineyards, Carmel mountains at sunset, founders street",
  "פרדס חנה-כרכור":
    "citrus orchards, rural Sharon plain landscape, golden afternoon",
  אשדוד:
    "mediterranean coast, modern marina, golden hour beach",
  הרצליה:
    "marina yachts, modern coastal Israeli architecture, palm boulevard",
  נצרת:
    "stone basilica, old Galilee city architecture, warm light",
  אילת:
    "Red Sea coastal landscape, desert mountains, golden hour",
  רעננה:
    "modern Sharon plain urban architecture, palm avenue, golden hour",
};

export function cityBackgroundPrompt(city: string): string {
  const landmark =
    LANDMARKS[city] ||
    "premium Israeli architectural landscape with palm trees, warm golden hour light";
  return [
    "Photorealistic real-estate marketing background.",
    `Subject: ${landmark}.`,
    "Empty atmospheric scene suitable for overlaying property photos and text.",
    "Premium Israeli aesthetic. Warm natural light.",
    "No text, no watermarks, no logos, no people.",
    "Square 1:1, square camera framing, top-down or eye-level shot.",
  ].join(" ");
}
