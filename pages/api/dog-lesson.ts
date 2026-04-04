// pages/api/dog-lesson.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { SUPABASE_PUBLIC_ORIGIN } from '@/lib/publicAssetUrls';
import { getRequestLang } from '@/lib/i18n/routing';
import { getTranslatedContent } from '@/lib/contentTranslations';
import { createServerSupabaseClient } from '@/lib/server/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { slug } = req.query;

  if (!slug || typeof slug !== 'string') {
    return res.status(400).json({ error: 'Slug is required' });
  }

  const supabase = createServerSupabaseClient();
  const { data: lessonRow, error: lessonLookupError } = await supabase
    .from('lessons')
    .select('id')
    .eq('slug', slug)
    .single();

  if (lessonLookupError || !lessonRow?.id) {
    return res.status(404).json({ error: 'Lesson not found' });
  }

  const { content, translated } = await getTranslatedContent('lesson', lessonRow.id, getRequestLang(req));
  const lesson = content as Record<string, unknown>;

  if (Array.isArray(lesson.steps)) {
    const updatedSteps = await Promise.all(
      lesson.steps.map(async (step: any) => {
        // Ensure step.image contains only the path inside the bucket (no 'public/' and no full URL)
        let imagePath = step.image;
        if (imagePath.startsWith('public/')) {
          imagePath = imagePath.replace(/^public\//, '');
        }
        // Remove full URL if present
        imagePath = imagePath.replace(/^https?:\/\/[^/]+\/storage\/v1\/object\/public\/lessons\//, '');

        const { data: signedUrlData } = await supabase.storage
          .from('lessons')
          .createSignedUrl(imagePath, 60 * 60);
        return {
          ...step,
          image: signedUrlData?.signedUrl?.startsWith('http')
            ? signedUrlData.signedUrl
            : `${SUPABASE_PUBLIC_ORIGIN}${signedUrlData?.signedUrl || ''}`,
        };
      })
    );
    lesson.steps = updatedSteps;
  }

  res.status(200).json({
    translated,
    lesson,
  });
}
