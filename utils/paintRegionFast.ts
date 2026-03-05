export function paintRegionFast(
  ctx: CanvasRenderingContext2D,
  regionData: {
    width: number
    height: number
    regionMap: Int32Array
  },
  regionId: number,
  color: [number, number, number]
) {
  const { width, height, regionMap } = regionData

  const imageData = ctx.getImageData(0, 0, width, height)
  const data = imageData.data

  const [r, g, b] = color

  for (let i = 0; i < regionMap.length; i++) {
    if (regionMap[i] !== regionId) continue

    const idx = i * 4

    data[idx] = r
    data[idx + 1] = g
    data[idx + 2] = b
    data[idx + 3] = 255
  }

  ctx.putImageData(imageData, 0, 0)
}