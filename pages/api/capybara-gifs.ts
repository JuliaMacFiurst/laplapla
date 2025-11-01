import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

const GIPHY_API_KEY = process.env.GIPHY_API_KEY;

export default async function handler(
  _: NextApiRequest,
  res: NextApiResponse
) {
  if (!GIPHY_API_KEY) {
    return res.status(500).json({ error: 'GIPHY_API_KEY not set' });
  }

  try {
    const response = await axios.get('https://api.giphy.com/v1/gifs/search', {
      params: {
        api_key: GIPHY_API_KEY,
        q: 'capybara',
        limit: 10,
        rating: 'g',
      },
    });

    const data = response.data as { data: any[] };
    const gifs = data.data.map((item: any) => ({
      type: 'gif',
      gifUrl: item.images.original.url,
    }));

    const shuffleArray = <T,>(array: T[]): T[] =>
      array
        .map(value => ({ value, sort: Math.random() }))
        .sort((a, b) => a.sort - b.sort)
        .map(({ value }) => value);

    const shuffledGifs = shuffleArray(gifs);

    res.status(200).json(shuffledGifs);
  } catch (error) {
    console.error('Ошибка при обращении к Giphy API:', error);
    res.status(500).json({ error: 'Ошибка при получении гифок с капибарами' });
  }
}