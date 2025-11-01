// pages/api/colorize.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { GoogleAuth } from "google-auth-library";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");


  // ⏱️ Timing helpers
  const t0 = process.hrtime.bigint();
  const ms = () => Number(process.hrtime.bigint() - t0) / 1e6;
  let tAuthStart = 0, tAuthEnd = 0, tReqStart = 0, tReqEnd = 0, tBufStart = 0, tBufEnd = 0;

  try {
    const { image, point, place, name } = req.body;

    if (
      typeof image !== "string" ||
      typeof point !== "string" ||
      typeof place !== "string" ||
      typeof name !== "string"
    ) {
      return res.status(400).json({ error: "All inputs must be base64 strings and name must be a string." });
    }

    if (!image || !point || !place || !name) {
      return res.status(400).json({ error: "Missing required data (image, point, place, or name)." });
    }

    console.log("🧩 Image size:", image.length);
    console.log("🧩 Point size:", point.length);
    console.log("🧩 Place size:", place.length);

    const payload = {
      image,
      point,
      place,
      name,
    };

    console.log("📦 Payload keys:", Object.keys(payload));
    console.log("📏 Lengths:", {
      image: image.length,
      point: point.length,
      place: place.length,
    });
    console.log("🧷 Name:", name);

    const forceLocal = process.env.FORCE_LOCAL === "true";
    const envUseCloud = process.env.USE_CLOUD === "true";

    const useCloud = !forceLocal && envUseCloud;

    const localUrl = "http://127.0.0.1:8080/point";
    const cloudUrl = process.env.TESTING_CLOUD_RUN_URL
      ? `${process.env.TESTING_CLOUD_RUN_URL}/point`
      : null;

    const targetUrl = useCloud && cloudUrl ? cloudUrl : localUrl;

    console.log("🌐 FORCE_LOCAL:", forceLocal);
    console.log("🌐 USE_CLOUD:", envUseCloud);
    console.log("🌐 Effective mode:", useCloud ? "Cloud Run" : "Local server");

    console.log(`📤 Sending payload to ${useCloud ? "Cloud Run" : "local"} server: ${targetUrl}`);
    console.log("🔧 Mode:", useCloud ? "Cloud" : "Local");
    console.log("🔧 Env USE_CLOUD:", process.env.USE_CLOUD);
    console.log("🔧 GOOGLE_APPLICATION_CREDENTIALS:", process.env.GOOGLE_APPLICATION_CREDENTIALS);
    console.log("🔧 TESTING_CLOUD_RUN_URL:", process.env.TESTING_CLOUD_RUN_URL);
    console.log("🧪 Payload preview (first 100 chars):", JSON.stringify(payload).slice(0, 100));

    let responseGaxios: any = null;
    let responseFetch: Response | null = null;

    if (useCloud) {
      tAuthStart = ms();
      // For ID token flow to Cloud Run, do NOT specify OAuth scopes.
      // Supplying scopes together with target audience causes:
      // "invalid_request: cannot specify both scope and target audience in jwt."
      const auth = new GoogleAuth({
        keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      });

      const client = await auth.getIdTokenClient(targetUrl);
      tAuthEnd = ms();

      const method = "POST" as
        | "GET"
        | "HEAD"
        | "POST"
        | "DELETE"
        | "PUT"
        | "CONNECT"
        | "OPTIONS"
        | "TRACE"
        | "PATCH";

      console.log("🚀 Requesting Cloud Run with ID token...");
      console.log("🚀 Cloud target URL:", targetUrl);
      tReqStart = ms();
      responseGaxios = await client.request({
        url: targetUrl,
        method,
        data: payload,
        headers: { "Content-Type": "application/json" },
        responseType: "arraybuffer",
        timeout: 20000,
      });
      tReqEnd = ms();
      console.log("✅ Cloud Run responded");
      console.log("✅ Cloud Run status:", responseGaxios.status);
      console.log("✅ Cloud Run headers:", responseGaxios.headers);
      console.log("✅ Cloud Run response length:", responseGaxios.data?.length);
    } else {
      console.log("🔧 Local mode: sending POST to local server...");
      console.log("🔧 Local target URL:", targetUrl);
      tReqStart = ms();
      responseFetch = await fetch(targetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      tReqEnd = ms();
      console.log("✅ Local fetch response status:", responseFetch.status);
      console.log("✅ Local fetch ok:", responseFetch.ok);
    }

    if (!useCloud) {
      if (!responseFetch || !responseFetch.ok) {
        const errorText = responseFetch ? await responseFetch.text() : "No response";
        console.error("❌ Colorization server error:", errorText);
        return res.status(500).json({ error: "Colorization server error", details: errorText });
      }
    }

    console.log("🖼 Received response from colorization server");
    console.log("📥 Preparing to convert response to buffer...");
    tBufStart = ms();
    const buffer = useCloud
      ? Buffer.from(responseGaxios.data)
      : Buffer.from(await responseFetch!.arrayBuffer());
    tBufEnd = ms();

    res.setHeader("Content-Type", "image/png");
    res.status(200).send(buffer);
    console.log("✅ Response sent to frontend. Buffer size:", buffer.length);
    console.log("⏱️ Timing summary (ms)", {
      total: ms().toFixed(1),
      auth: (tAuthEnd - tAuthStart).toFixed(1),
      request: (tReqEnd - tReqStart).toFixed(1),
      toBuffer: (tBufEnd - tBufStart).toFixed(1),
      payloadSizes: { image: image.length, point: point.length, place: place.length },
      mode: useCloud ? "cloud" : "local",
    });
  } catch (err) {
    console.error("💥 Unexpected error:", err);
    res.status(500).json({ error: "Colorization failed" });
  }
}
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '25mb',
    },
  },
};