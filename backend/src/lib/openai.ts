import OpenAI from "openai";

let _client: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (!_client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not set in .env");
    _client = new OpenAI({ apiKey });
  }
  return _client;
}

export const MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";

/**
 * Call GPT-4.1 Mini with a system + user prompt.
 * Returns the text response. Throws on failure.
 */
export async function chat(systemPrompt: string, userPrompt: string, maxTokens = 1500): Promise<string> {
  const openai = getOpenAI();
  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user",   content: userPrompt },
    ],
    max_tokens: maxTokens,
    temperature: 0.7,
  });
  return response.choices[0]?.message?.content?.trim() || "";
}

/**
 * Call GPT-4.1 Mini and parse the response as JSON.
 * Falls back to a default value if parsing fails.
 */
export async function chatJSON<T>(
  systemPrompt: string,
  userPrompt: string,
  fallback: T,
  maxTokens = 1500
): Promise<T> {
  try {
    const text = await chat(systemPrompt, userPrompt, maxTokens);
    // Extract JSON from markdown code blocks if present
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    const jsonStr = jsonMatch ? jsonMatch[1] : text;
    return JSON.parse(jsonStr) as T;
  } catch (err) {
    console.error("GPT JSON parse failed:", err);
    return fallback;
  }
}
