// /pages/api/capybara-videos.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { fetchCapybaraVideos } from './capybara-slides';

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  const videos = await fetchCapybaraVideos();
  res.status(200).json(videos);
}