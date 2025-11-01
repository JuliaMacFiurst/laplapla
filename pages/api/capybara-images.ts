import axios from 'axios';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  _: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const response = await axios.get('https://api.pexels.com/v1/search', {
      headers: {
        Authorization: process.env.PEXELS_API_KEY || '',
      },
      params: {
        query: 'capybara',
        per_page: 15,
        page: 1,
      },
    });

    const data = response.data as { photos: any[] };
    const photos = data.photos || [];

    const images = photos.map((photo: any) => ({
      type: 'image' as const,
      imageUrl: photo.src.medium,
      imageAlt: photo.alt || 'Capybara',
    }));

    res.status(200).json(images);
  } catch (error) {
    console.error('Failed to fetch images from Pexels:', error);
    res.status(500).json({ error: 'Failed to fetch images' });
  }
}
