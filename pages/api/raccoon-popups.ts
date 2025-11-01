import type { NextApiRequest, NextApiResponse } from "next";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GEMINI_MODEL_NAME } from "../../constants";

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
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const modelToUse = model || GEMINI_MODEL_NAME;
    const generationModel = genAI.getGenerativeModel({ model: modelToUse });

    const result = await generationModel.generateContent(prompt);
    const rawText = result.response.text();
    const text = rawText.replace(/\*/g, ""); // удаляем все звёздочки из текста

    res.status(200).json({ output: text });
  } catch (error) {
    console.error("Gemini API error:", error);
    res.status(500).json({ error: "Failed to fetch from Gemini API" });
  }
}
