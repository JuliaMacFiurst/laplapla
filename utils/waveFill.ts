// Organic ink wave fill
// Seeds spread color with soft blending and circular growth

export type Seed = {
  x: number
  y: number
  regionId: number
  color: [number, number, number]
}

export type RegionData = {
  width: number
  height: number
  regionMap: Int32Array
}

// Helper to blend colors
function mix(a: number, b: number, t: number) {
  return a * (1 - t) + b * t
}

// lightweight smooth noise (pseudo‑Perlin) for organic watercolor edges
function noise2D(x: number, y: number) {
  const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453
  return s - Math.floor(s)
}

export function waveFill(
  ctx: CanvasRenderingContext2D,
  regionData: RegionData,
  seeds: Seed[]
) {
  const { width, height, regionMap } = regionData

  const image = ctx.getImageData(0, 0, width, height)
  const pixels = image.data

  type Wave = {
    seed: Seed
    radius: number
  }

  const waves: Wave[] = seeds.map(s => ({ seed: s, radius: 0 }))

  // if seed is slightly outside the region (because paw is large),
  // move it to the nearest pixel of the same region
  function adjustSeedPosition(seed: Seed): Seed {
    const { x, y, regionId } = seed

    const ix = Math.floor(x)
    const iy = Math.floor(y)

    const radius = 6

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const px = ix + dx
        const py = iy + dy

        if (px < 0 || py < 0 || px >= width || py >= height) continue

        const index = py * width + px
        if (regionMap[index] === regionId) {
          return { ...seed, x: px, y: py }
        }
      }
    }

    return seed
  }

  // adjust seeds before creating waves
  for (let i = 0; i < waves.length; i++) {
    waves[i].seed = adjustSeedPosition(waves[i].seed)
  }

  const maxRadius = Math.max(width, height)
  // limit how far ink can spread from each seed
  const influenceRadius = maxRadius * 0.35
  // soft watercolor edge thickness
  const edgeSoftness = influenceRadius * 0.25

  function drawFrame() {
    let active = false

    for (let wi = 0; wi < waves.length; wi++) {
      const wave = waves[wi]
      if (wave.radius > influenceRadius) continue

      active = true

      const { x, y, regionId, color } = wave.seed
      const [r, g, b] = color

      const minX = Math.max(0, Math.floor(x - wave.radius))
      const maxX = Math.min(width - 1, Math.floor(x + wave.radius))
      const minY = Math.max(0, Math.floor(y - wave.radius))
      const maxY = Math.min(height - 1, Math.floor(y + wave.radius))

      for (let py = minY; py <= maxY; py++) {
        for (let px = minX; px <= maxX; px++) {
          const dx = px - x
          const dy = py - y

          const dist = Math.sqrt(dx * dx + dy * dy)

          // softer spatial noise for watercolor edges
          const n = noise2D(px * 0.06, py * 0.06) - 0.5
          const noise = n * 4

          // compute how far the wave has progressed past this pixel
          const progress = (wave.radius + noise) - dist

          // if the wave has not reached the pixel at all, skip it
          if (progress < -edgeSoftness) continue

          const index = py * width + px
          const rm = regionMap[index]

          // allow paint slightly into anti‑alias pixels near the region
          let antiAliasPixel = false
          let antiAliasDistance = 0
          if (rm !== regionId) {
            if (rm === -1) {
              const isRegionAt = (qx: number, qy: number) => {
                if (qx < 0 || qy < 0 || qx >= width || qy >= height) return false
                return regionMap[qy * width + qx] === regionId
              }

              // first anti‑alias ring: direct 8-neighbour touch
              const touchesRegion1 =
                isRegionAt(px - 1, py) ||
                isRegionAt(px + 1, py) ||
                isRegionAt(px, py - 1) ||
                isRegionAt(px, py + 1) ||
                isRegionAt(px - 1, py - 1) ||
                isRegionAt(px + 1, py - 1) ||
                isRegionAt(px - 1, py + 1) ||
                isRegionAt(px + 1, py + 1)

              // second anti‑alias ring: 2px away, still very weak
              const touchesRegion2 =
                isRegionAt(px - 2, py) ||
                isRegionAt(px + 2, py) ||
                isRegionAt(px, py - 2) ||
                isRegionAt(px, py + 2) ||
                isRegionAt(px - 2, py - 1) ||
                isRegionAt(px - 2, py + 1) ||
                isRegionAt(px + 2, py - 1) ||
                isRegionAt(px + 2, py + 1) ||
                isRegionAt(px - 1, py - 2) ||
                isRegionAt(px + 1, py - 2) ||
                isRegionAt(px - 1, py + 2) ||
                isRegionAt(px + 1, py + 2) ||
                isRegionAt(px - 2, py - 2) ||
                isRegionAt(px + 2, py - 2) ||
                isRegionAt(px - 2, py + 2) ||
                isRegionAt(px + 2, py + 2)

              if (!touchesRegion1 && !touchesRegion2) continue

              antiAliasPixel = true
              antiAliasDistance = touchesRegion1 ? 1 : 2
            } else {
              continue
            }
          }

          const i = index * 4

          // smooth pigment falloff from seed
          const sigma = influenceRadius * 0.45
          const gaussian = Math.exp(-(dist * dist) / (2 * sigma * sigma))

          // additional fade based on wave progress to avoid final "snap"
          let edgeFade = 1
          if (progress < edgeSoftness) {
            edgeFade = (progress + edgeSoftness) / (2 * edgeSoftness)
          }

          const falloff = gaussian * Math.max(0, Math.min(1, edgeFade))

          let cr = pixels[i]
          let cg = pixels[i + 1]
          let cb = pixels[i + 2]
          let ca = pixels[i + 3]

          // boost influence of new pigment so fresh paw prints remain visible
          // pixels that already contain a lot of paint (alpha close to 255)
          // get slightly stronger mixing to avoid muddy averaging
          const pigmentBoost = 1 - Math.min(1, ca / 255)

          // base watercolor weight
          let weight = falloff * 0.18

          // paint anti‑alias pixels much more gently so color does not cross the contour
          if (antiAliasPixel) {
            // first ring gets a bit more color, second ring only a whisper
            weight *= antiAliasDistance === 1 ? 0.45 : 0.18
          }

          // increase influence of fresh paint
          weight += falloff * pigmentBoost * 0.35

          // clamp weight to safe watercolor range
          if (weight > 0.55) weight = 0.55

          // give newer seeds slightly stronger influence so last color stays on top
          const orderBoost = wi / waves.length
          weight += falloff * orderBoost * 0.25
          if (weight > 0.75) weight = 0.75

          // treat transparent pixels as white paper instead of black
          if (ca === 0) {
            cr = 255
            cg = 255
            cb = 255
          }

          pixels[i] = mix(cr, r, weight)
          pixels[i + 1] = mix(cg, g, weight)
          pixels[i + 2] = mix(cb, b, weight)
          pixels[i + 3] = Math.min(255, ca + weight * 255)
        }
      }

      // smoother expansion to avoid visible circular steps
      wave.radius += 1.6 + noise2D(x * 0.03 + wave.radius, y * 0.03) * 1.2
    }

    ctx.putImageData(image, 0, 0)

    if (active) requestAnimationFrame(drawFrame)
  }

  requestAnimationFrame(drawFrame)
}
