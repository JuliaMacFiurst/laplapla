import { fetchWithTimeout } from "@/lib/server/security/fetchWithTimeout";

export async function searchPexelsVideos(
  query: string
): Promise<string[]> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    return [];
  }

  const normalizedQuery = query.trim().replace(/\s+/g, " ").slice(0, 160);
  if (!normalizedQuery) {
    return [];
  }

  const searchParams = new URLSearchParams({
    query: normalizedQuery,
    per_page: "24",
  });

  const response = await fetchWithTimeout(
    `https://api.pexels.com/videos/search?${searchParams.toString()}`,
    {
      headers: {
        Authorization: apiKey,
      },
    },
    6_000,
  );

  if (!response.ok) {
    return [];
  }

  const json = await response.json();

  const videos = json?.videos
    ?.filter((v: any) => v?.video_files?.length)
    .map((v: any) =>
      v.video_files.find(
        (f: any) =>
          f.file_type === "video/mp4"
      )?.link
    )
    .filter(Boolean) as string[];

  return videos || [];
}

export async function fetchVideoFromPexels(
  query: string
): Promise<string | null> {
  const videos = await searchPexelsVideos(query);

  if (videos.length > 0) {
    return videos[Math.floor(Math.random() * videos.length)];
  }

  return null;
}
