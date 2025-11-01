import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
import fetch from "node-fetch";

// === CONFIGURATION ===
const BATCH_LIMIT = 2;
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);
const GOOGLE_TTS_API_KEY = process.env.GEMINI_API_KEY!;
const BUCKET_NAME = "map_audio"; // ensure this bucket exists
const TABLE_NAME = "map_stories"; // table with text content

let totalCharsUsed = 0;
const FREE_TIER_LIMIT = 4_000_000;

// Ensure the bucket exists, create if missing
async function ensureBucketExists() {
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) {
    console.error("⚠️ Could not list buckets:", error);
    return;
  }

  const exists = buckets.some(b => b.name === BUCKET_NAME);
  if (!exists) {
    console.log(`🪣 Creating bucket "${BUCKET_NAME}"...`);
    const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, { public: true });
    if (createError) console.error("❌ Failed to create bucket:", createError);
    else console.log(`✅ Bucket "${BUCKET_NAME}" created successfully!`);
  } else {
    console.log(`🪣 Bucket "${BUCKET_NAME}" already exists.`);
  }
}

// Helper to split text into chunks for TTS API limits
function splitText(text: string, maxBytes = 4500): string[] {
  const parts: string[] = [];
  let current = "";

  const sentences = text.split(/(?<=[.!?])\s+/);
  for (const sentence of sentences) {
    const currentBytes = Buffer.byteLength(current + sentence, "utf-8");
    if (currentBytes > maxBytes) {
      parts.push(current.trim());
      current = sentence;
    } else {
      current += (current ? " " : "") + sentence;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

async function main() {
  console.log("🦝 Checking for missing audio in Supabase...");
  await ensureBucketExists();

  const { data: stories, error } = await supabase
    .from(TABLE_NAME)
    .select("id, target_id, content, audio_url")
    .is("audio_url", null)
    .limit(BATCH_LIMIT); // limit for testing, remove later

  if (error) throw error;
  if (!stories || stories.length === 0) {
    console.log("✅ All stories already have audio!");
    return;
  }

  for (const story of stories) {
    const { id, content } = story;
    console.log(`🎙 Generating TTS for story ${id}...`);
    try {
      const textContent = typeof content === "string" ? content : JSON.stringify(content);
      console.log(`  🧩 Content length (bytes): ${Buffer.byteLength(textContent, "utf-8")}`);
      const chunks = splitText(textContent);
      if (chunks.length === 1 && Buffer.byteLength(chunks[0], "utf-8") > 4500) {
        console.log(`  ⚙️ Splitting long text by byte size...`);
        const forcedChunks: string[] = [];
        let text = chunks[0];
        while (Buffer.byteLength(text, "utf-8") > 4500) {
          let cutIndex = text.lastIndexOf(" ", 4000);
          if (cutIndex === -1) cutIndex = 4000;
          forcedChunks.push(text.slice(0, cutIndex));
          text = text.slice(cutIndex);
        }
        if (text.trim()) forcedChunks.push(text.trim());
        chunks.splice(0, chunks.length, ...forcedChunks);
      }
      const buffers: Buffer[] = [];

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        console.log(`  🔊 Part ${i + 1}/${chunks.length} (${chunk.length} chars)`);

        const ttsResponse = await fetch(
          `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_TTS_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              input: { text: chunk },
              voice: { languageCode: "ru-RU", name: "ru-RU-Standard-C" },
              audioConfig: {
                audioEncoding: "MP3",
                speakingRate: 1.02,
                pitch: 1.0,
              },
            }),
          }
        );

        if (!ttsResponse.ok) {
          const errText = await ttsResponse.text();
          console.error(`❌ TTS failed for ${id} part ${i + 1}:`, errText);
          continue;
        }

        const ttsData = (await ttsResponse.json()) as { audioContent?: string };
        const audioContent = ttsData.audioContent;
        if (!audioContent) {
          console.error(`❌ No audioContent returned for ${id} part ${i + 1}`);
          continue;
        }

        const buffer = Buffer.from(audioContent, "base64");
        buffers.push(buffer);
        totalCharsUsed += chunk.length;
        console.log(`  🧮 Used this run: ${totalCharsUsed} chars (~${((totalCharsUsed / FREE_TIER_LIMIT) * 100).toFixed(3)}% of free tier)`);
        await new Promise(r => setTimeout(r, 500)); // small delay to avoid quota spikes
      }

      if (buffers.length === 0) {
        console.error(`⚠️ No audio generated for ${id}`);
        continue;
      }

      const finalBuffer = Buffer.concat(buffers);
      const filePath = `stories/${id}.mp3`;

      // Upload to Supabase Storage
      const upload = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, finalBuffer, {
          contentType: "audio/mpeg",
          upsert: true,
        });

      if (upload.error) {
        console.error(`❌ Upload failed for ${id}:`, upload.error);
        continue;
      }

      // Get public URL
      const { data: pub } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);
      const audioUrl = pub.publicUrl;

      // Update record in table
      const { error: updateError } = await supabase
        .from(TABLE_NAME)
        .update({ audio_url: audioUrl })
        .eq("id", id);

      if (updateError) {
        console.error(`❌ Update failed for ${id}:`, updateError);
        continue;
      }

      console.log(`✅ ${id} processed successfully!`);
    } catch (err) {
      console.error(`⚠️ Error processing ${story.id}:`, err);
    }
  }

  console.log(`📊 Total characters processed this session: ${totalCharsUsed} (~${((totalCharsUsed / FREE_TIER_LIMIT) * 100).toFixed(3)}% of 4M free tier).`);
  console.log("🎉 Done! All missing audios processed.");
}

main().catch(console.error);