export async function getMapSvg(path: string): Promise<string | null> {
  try {
    const response = await fetch(`/api/map-svg?path=${encodeURIComponent(path)}`);
    if (!response.ok) {
      console.error("❌ Не удалось загрузить карту:", path, response.status);
      return null;
    }

    return await response.text();
  } catch (error) {
    console.error("❌ Ошибка чтения SVG:", error);
    return null;
  }
}

export function getPublicMapUrl(path: string): string {
  return `/api/map-svg?path=${encodeURIComponent(path)}`;
}
