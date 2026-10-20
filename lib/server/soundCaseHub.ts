import { createServerSupabaseClient } from "@/lib/server/supabase";

const SINGING_DUNE_LESSON_SLUG = "poyushaya-dyuna";
const LESSON_PREVIEW_URL_TTL_SECONDS = 60 * 60;

export async function loadSoundCaseHubDrawingPreview(): Promise<string | null> {
  const supabase = createServerSupabaseClient();
  const { data: lesson, error } = await supabase
    .from("lessons")
    .select("preview")
    .eq("slug", SINGING_DUNE_LESSON_SLUG)
    .maybeSingle();

  if (error) throw error;
  if (!lesson?.preview) return null;

  const { data, error: signedUrlError } = await supabase.storage
    .from("lessons")
    .createSignedUrl(lesson.preview, LESSON_PREVIEW_URL_TTL_SECONDS);

  if (signedUrlError) throw signedUrlError;
  return data?.signedUrl || null;
}
