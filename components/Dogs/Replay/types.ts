export type ReplayBrushStyle =
  | "normal"
  | "smooth"
  | "sparkle"
  | "rainbow"
  | "chameleon"
  | "gradient"
  | "neon"
  | "watercolor";

export type ReplayBrushSettings = {
  size: number;
  color: string;
  opacity: number;
  style: ReplayBrushStyle;
  isEraser: boolean;
};

export type ReplayRgb = [number, number, number];
export type ReplaySeed = {
  x: number;
  y: number;
  regionId: number;
  color: ReplayRgb;
};

export type ReplayRegionData = {
  width: number;
  height: number;
  regionMap: Int32Array;
};

export type ReplayAction =
  | {
      type: "strokeStart";
      x: number;
      y: number;
      brush: ReplayBrushSettings;
    }
  | {
      type: "strokePoint";
      x: number;
      y: number;
    }
  | {
      type: "strokeEnd";
    }
  | {
      type: "pawPlace";
      x: number;
      y: number;
      regionId: number;
      color: ReplayRgb;
    }
  | {
      type: "fillRegion";
      regionId: number;
      color: ReplayRgb;
      seedX: number;
      seedY: number;
    }
  | {
      type: "autoColorStart";
      seeds: ReplaySeed[];
      regionMapId: number;
    }
  | {
      type: "clearPaws";
    }
  | {
      type: "clearAll";
    };

export type ReplayActionGroup = {
  id: number;
  actions: ReplayAction[];
};
