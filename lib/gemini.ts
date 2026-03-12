import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

export async function generateText(
  prompt: string,
  model = "gemini-2.5-flash",
  config?: Record<string, unknown>
) {
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      maxOutputTokens: 400,
      temperature: 0.6,
      ...(config ?? {}),
    },
  });

  return response.text;
}