import type { NextApiRequest, NextApiResponse } from "next";

type TtsSuccessResponse = {
  audioUrl: string;
};

type TtsErrorResponse = {
  error: string;
};

type GoogleTtsResponse = {
  audioContent?: string;
};

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TtsSuccessResponse | TtsErrorResponse>,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { text, languageCode, voiceName } = req.body ?? {};

  if (!isNonEmptyString(text)) {
    return res.status(400).json({ error: "Text is required" });
  }

  const apiKey = process.env.GOOGLE_TTS_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Missing GOOGLE_TTS_API_KEY" });
  }

  try {
    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: { text },
          voice: {
            languageCode: isNonEmptyString(languageCode) ? languageCode : "ru-RU",
            name: isNonEmptyString(voiceName) ? voiceName : undefined,
          },
          audioConfig: {
            audioEncoding: "MP3",
          },
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({
        error: errorText || "Failed to synthesize speech",
      });
    }

    const payload = (await response.json()) as GoogleTtsResponse;
    if (!isNonEmptyString(payload.audioContent)) {
      return res.status(502).json({ error: "TTS provider returned no audio" });
    }

    return res.status(200).json({
      audioUrl: `data:audio/mp3;base64,${payload.audioContent}`,
    });
  } catch (error) {
    console.error("[/api/tts-synthesize] request failed", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
