import { waveFill, type RegionData, type Seed } from "@/utils/waveFill";

type AutoColorOptions = {
  onFrame?: () => void | Promise<void>;
};

export type AutoColorRegionData = RegionData;
export type AutoColorSeed = Seed;

export function autoColorRegions(
  ctx: CanvasRenderingContext2D,
  regionData: AutoColorRegionData,
  seeds: AutoColorSeed[],
  options?: AutoColorOptions,
) {
  return waveFill(ctx, regionData, seeds, options);
}
