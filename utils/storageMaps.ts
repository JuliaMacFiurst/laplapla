import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function getMapSvg(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from("map-data")
    .download(path);

  if (error) {
    console.error("❌ Не удалось загрузить карту из Supabase Storage:", path, error);
    return null;
  }

  try {
    const text = await data.text();
    return text;
  } catch (err) {
    console.error("❌ Ошибка чтения SVG:", err);
    return null;
  }
}

export function getPublicMapUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/map-data/${path}`;
}