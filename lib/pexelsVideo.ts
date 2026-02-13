const PEXELS_API_KEY = process.env.PEXELS_API_KEY;

if (!PEXELS_API_KEY) {
  throw new Error("PEXELS_API_KEY is not set in environment variables.");
}

export async function searchPexelsVideos(
  query: string
): Promise<string[]> {
  const searchParams = new URLSearchParams({
    query,
    per_page: "10",
    orientation: "portrait",
    size: "medium",
    min_duration: "3",
    max_duration: "15",
  });

  const response = await fetch(
    `https://api.pexels.com/videos/search?${searchParams.toString()}`,
    {
      headers: {
        Authorization: PEXELS_API_KEY!,
      },
    }
  );

  if (!response.ok) {
    console.error("Pexels API error:", response.statusText);
    return [];
  }

  const json = await response.json();

  const videos = json?.videos
    ?.filter((v: any) => v?.video_files?.length)
    .map((v: any) =>
      v.video_files.find((f: any) =>
        f.quality === "sd" &&
        f.width <= 1080 &&
        f.height <= 1920 &&
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
