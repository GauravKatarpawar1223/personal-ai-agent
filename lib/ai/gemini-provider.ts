import type { AiHistoryMessage, AiProvider, AiReply } from "@/lib/ai/types";
import { AiProviderError } from "@/lib/ai/types";

// Check https://ai.google.dev/gemini-api/docs for the current model list
// and the current Google Search grounding tool shape before relying on
// these in production — model names are dated identifiers Google revises
// over time.
const GEMINI_MODEL = "gemini-3.5-flash-lite";
const GOOGLE_SEARCH_TOOL = { google_search: {} };

interface GeminiPart {
  text?: string;
}

interface GeminiCandidate {
  content?: { parts?: GeminiPart[] };
  groundingMetadata?: { webSearchQueries?: string[] };
}

export const geminiProvider: AiProvider = {
  id: "gemini",
  displayName: "Gemini",

  isConfigured() {
    return Boolean(process.env.GEMINI_API_KEY);
  },

  async generateReply({ systemPrompt, history }): Promise<AiReply> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new AiProviderError(
        "The AI provider isn't configured yet. Set GEMINI_API_KEY on the server and redeploy.",
        501
      );
    }

    const contents = history.map((m: AiHistoryMessage) => ({
      role: m.role === "agent" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    let response: Response;
    try {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify({
            contents,
            systemInstruction: { parts: [{ text: systemPrompt }] },
            tools: [GOOGLE_SEARCH_TOOL],
            generationConfig: { maxOutputTokens: 1024 },
          }),
        }
      );
    } catch {
      throw new AiProviderError("Couldn't reach the AI provider. Check your connection and try again.", 502);
    }

    if (!response.ok) {
      const rawDetail = await response.text().catch(() => "");
      let geminiMessage = "";
      try {
        const parsed = JSON.parse(rawDetail) as { error?: { message?: string } };
        geminiMessage = parsed.error?.message ?? "";
      } catch {
        // Not JSON — fall back to the raw body below.
      }
      // TEMPORARY: includes Gemini's own error message for debugging.
      // Consider trimming this back to a generic message once the
      // integration is stable, so raw provider errors aren't shown to users.
      throw new AiProviderError(
        `The AI provider returned an error (${response.status}): ${
          geminiMessage || rawDetail.slice(0, 300) || "no further detail"
        }`,
        response.status
      );
    }

    const data = (await response.json()) as { candidates?: GeminiCandidate[] };
    const candidate = data.candidates?.[0];
    const text = (candidate?.content?.parts ?? [])
      .map((p) => p.text ?? "")
      .join("")
      .trim();
    const usedWebSearch = Boolean(candidate?.groundingMetadata?.webSearchQueries?.length);

    if (!text) {
      throw new AiProviderError("The agent didn't return a response. Try rephrasing.", 502);
    }

    return { text, usedWebSearch };
  },
};
