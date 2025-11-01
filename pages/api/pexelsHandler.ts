const PEXELS_API_KEY = process.env.PEXELS_API_KEY;

export async function getPexelsImage(query: string): Promise<string | null> {
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1`;

  const res = await fetch(url, {
    headers: {
      Authorization: PEXELS_API_KEY || '',
    },
  });

  if (!res.ok) {
    console.error('Pexels fetch failed:', res.statusText);
    return null;
  }

  const data = await res.json();
  const photo = data.photos?.[0]?.src?.medium;
  return photo || null;
}