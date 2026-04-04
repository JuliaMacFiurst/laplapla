import type { NextApiRequest, NextApiResponse } from "next";
import { loadExplanationModes } from "@/lib/books";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    return res.status(200).json(await loadExplanationModes());
  } catch (error) {
    console.error("Failed to load explanation modes:", error);
    return res.status(500).json({ error: "Failed to load explanation modes" });
  }
}
