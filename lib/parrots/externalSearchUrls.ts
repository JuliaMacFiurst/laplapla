export function buildGoogleSearchUrl(query: string) {
  const url = new URL("https://www.google.com/search");
  url.searchParams.set("q", query);
  return url.toString();
}

export function buildYouTubeSearchUrl(query: string) {
  const url = new URL("https://www.youtube.com/results");
  url.searchParams.set("search_query", query);
  return url.toString();
}
