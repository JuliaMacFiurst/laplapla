import type { NextApiRequest, NextApiResponse } from "next";
import { GEMINI_MODEL_NAME } from "../../constants";
import { generateText } from "@/lib/gemini";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { prompt, model } = req.body;

  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "Missing or invalid prompt" });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: "Missing Gemini API key" });
  }

  try {
    const modelToUse = model || GEMINI_MODEL_NAME;
    const rawText = (await generateText(prompt, modelToUse)) ?? "";
    const text = rawText.replace(/\*/g, ""); // удаляем все звёздочки из текста

    res.status(200).json({ output: text });
  } catch (error) {
    console.error("Gemini API error:", error);
    res.status(500).json({ error: "Failed to fetch from Gemini API" });
  }
}
