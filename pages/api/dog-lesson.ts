// pages/api/dog-lesson.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { slug } = req.query;

  if (!slug || typeof slug !== 'string') {
    return res.status(400).json({ error: 'Slug is required' });
  }

  const { data, error } = await supabase
    .from('lessons')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !data) {
    return res.status(404).json({ error: 'Lesson not found' });
  }

  if (Array.isArray(data.steps)) {
    const updatedSteps = await Promise.all(
      data.steps.map(async (step: any) => {
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
            : `https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/sign/${signedUrlData?.signedUrl}`,
        };
      })
    );
    data.steps = updatedSteps;
  }

  res.status(200).json(data);
}