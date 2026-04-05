import type { NextApiRequest, NextApiResponse } from "next";
import { getRequestLang } from "@/lib/i18n/routing";
import { getTranslatedContents } from "@/lib/contentTranslations";
import { createServerSupabaseClient } from "@/lib/server/supabase";
import { withApiHandler } from "@/utils/apiHandler";

type LessonRecord = {
  id: string;
  title: string;
  preview: string;
  slug: string;
  category_slug: string;
};

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const category = typeof req.query.category === "string" ? req.query.category.trim() : "";
  if (!category) {
    return res.status(400).json({ error: "Category is required" });
  }

  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("lessons")
      .select("id, title, preview, slug, category_slug")
      .eq("category_slug", category);

    if (error) {
      throw error;
    }

    const lang = getRequestLang(req);
    const translatedLessons = data?.length
      ? await getTranslatedContents("lesson", data.map((lesson) => lesson.id), lang)
      : [];

    const lessons = (translatedLessons.length
      ? translatedLessons.map(({ content }) => content)
      : (data || [])) as LessonRecord[];

    const signedLessons = await Promise.all(
      lessons.map(async (lesson) => {
        if (!lesson.preview) {
          return { ...lesson, preview: "" };
        }

        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from("lessons")
          .createSignedUrl(lesson.preview, 60);

        if (signedUrlError || !signedUrlData?.signedUrl) {
          return { ...lesson, preview: "" };
        }

        return { ...lesson, preview: signedUrlData.signedUrl };
      }),
    );

    return res.status(200).json(signedLessons);
  } catch (error) {
    console.error("Failed to load dog lessons:", error);
    return res.status(500).json({ error: "Failed to load dog lessons" });
  }
}

export default withApiHandler(
  {
    guard: {
      methods: ["GET"],
      limit: 30,
      keyPrefix: "dog-lessons",
    },
    cacheControl: "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
  },
  handler,
);
