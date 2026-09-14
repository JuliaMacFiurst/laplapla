import { describe, expect, it } from "vitest";
import {
  applyPhysicMapStyling,
  classifyPhysicPath,
  orderPhysicPathNodes,
  selectBiomeSvgHit,
  selectPhysicSvgHit,
} from "@/lib/physicMapStyling";

type Hit = { id: string; box: { width: number; height: number } };
const getBox = (hit: Hit) => hit.box;
const hit = (id: string, area: number): Hit => ({ id, box: { width: area, height: 1 } });

describe("physical map visual hierarchy", () => {
  it("classifies islands, local groups, regional groups, and other layers", () => {
    expect(classifyPhysicPath("Island SUMATRA")).toBe("island");
    expect(classifyPhysicPath("Island group FIJI")).toBe("local-group");
    expect(classifyPhysicPath("Island group POLYNESIA")).toBe("regional-group");
    expect(classifyPhysicPath("Continent ASIA")).toBe("other");
    expect(classifyPhysicPath("island SUMATRA")).toBe("other");
    expect(classifyPhysicPath("Island  SUMATRA")).toBe("island");
    expect(classifyPhysicPath("Island grouping FIJI")).toBe("island");
  });

  it("moves existing path references while preserving other-layer slots", () => {
    const island = { id: "Island SUMATRA" };
    const mountain = { id: "Range/mtn ANDES" };
    const local = { id: "Island group FIJI" };
    const regional = { id: "Island group POLYNESIA" };
    const continent = { id: "Continent ASIA" };
    expect(orderPhysicPathNodes([island, mountain, local, regional, continent], (node) => node.id))
      .toEqual([regional, mountain, local, island, continent]);
  });

  it("keeps geometry and pointer attributes while styling the three levels", () => {
    const makePath = (id: string) => {
      const attrs = new Map([["id", id], ["d", "M0 0L1 0L1 1Z"],
        ["fill", "#ffffcc"], ["fill-rule", "evenodd"], ["pointer-events", "visiblePainted"]]);
      const styles = new Map<string, string>();
      return {
        id, nodeType: 1, localName: "path", attrs, styles,
        getAttribute: (name: string) => attrs.get(name) ?? null,
        style: { setProperty: (name: string, value: string) => styles.set(name, value) },
      };
    };
    const island = makePath("Island SUMATRA");
    const local = makePath("Island group FIJI");
    const regional = makePath("Island group POLYNESIA");
    const other = makePath("Continent ASIA");
    const original = [island, other, local, regional];
    const group = {
      childNodes: original,
      get children() { return this.childNodes; },
      replaceChildren(...nodes: typeof original) { this.childNodes = nodes; },
    };
    const svg = { querySelector: () => group } as unknown as SVGSVGElement;
    applyPhysicMapStyling(svg);
    expect(group.childNodes).toEqual([regional, other, local, island]);
    for (const path of original) {
      expect(path.attrs.get("id")).toBe(path.id);
      expect(path.attrs.get("d")).toBe("M0 0L1 0L1 1Z");
      expect(path.attrs.get("fill-rule")).toBe("evenodd");
      expect(path.attrs.get("pointer-events")).toBe("visiblePainted");
    }
    expect(island.styles.get("opacity")).toBe("1");
    expect(local.styles.get("opacity")).toBe("0.45");
    expect(regional.styles.get("fill-opacity")).toBe("0.12");
    expect(other.styles.size).toBe(0);
    const firstOrder = [...group.childNodes];
    const firstStyles = original.map((path) => [...path.styles]);
    applyPhysicMapStyling(svg);
    expect(group.childNodes).toEqual(firstOrder);
    expect(group.childNodes.every((path, index) => path === firstOrder[index])).toBe(true);
    expect(original.map((path) => [...path.styles])).toEqual(firstStyles);
  });

  it("colors duplicate IDs by geometry and independently of DOM order", () => {
    const makePath = (d: string) => {
      const styles = new Map<string, string>();
      return {
        id: "Island Flores", nodeType: 1, localName: "path", d, styles,
        getAttribute: (name: string) => name === "id" ? "Island Flores" : name === "d" ? d : null,
        style: { setProperty: (name: string, value: string) => styles.set(name, value) },
      };
    };
    const first = makePath("M0 0L1 0L1 1Z");
    const second = makePath("M2 0L3 0L3 1Z");
    const group = {
      childNodes: [first, second],
      get children() { return this.childNodes; },
      replaceChildren(...nodes: typeof this.childNodes) { this.childNodes = nodes; },
    };
    const svg = { querySelector: () => group } as unknown as SVGSVGElement;
    applyPhysicMapStyling(svg);
    const colors = [first.styles.get("fill"), second.styles.get("fill")];
    group.childNodes = [second, first];
    applyPhysicMapStyling(svg);
    expect([first.styles.get("fill"), second.styles.get("fill")]).toEqual(colors);
    expect(group.childNodes).toEqual([second, first]);
  });
});

describe("physical map hit priority", () => {
  it("prefers an island over a smaller local group", () => {
    const island = hit("Island SUMATRA", 100);
    const local = hit("Island group Batu Is.", 1);
    expect(selectPhysicSvgHit([local, island], getBox).selected).toBe(island);
  });

  it("prefers an island over a regional group", () => {
    const island = hit("Island SUMATRA", 100);
    const regional = hit("Island group MALAY ARCHIPELAGO", 1);
    expect(selectPhysicSvgHit([regional, island], getBox).selected).toBe(island);
  });

  it("prefers an island over another physic path even when its bbox is larger", () => {
    const island = hit("Island SUMATRA", 100);
    const continent = hit("Continent ASIA", 1);
    expect(selectPhysicSvgHit([continent, island], getBox).selected).toBe(island);
  });

  it("prefers a local group over a regional group", () => {
    const local = hit("Island group FIJI", 100);
    const regional = hit("Island group POLYNESIA", 1);
    expect(selectPhysicSvgHit([regional, local], getBox).selected).toBe(local);
  });

  it("keeps a regional group clickable when it is the only hit", () => {
    const regional = hit("Island group POLYNESIA", 100);
    expect(selectPhysicSvgHit([regional], getBox).selected).toBe(regional);
  });

  it("uses smallest bbox only within the best available level", () => {
    const largeIsland = hit("Island SUMATRA", 100);
    const smallIsland = hit("Island Bangka", 10);
    const tinyRegional = hit("Island group MALAY ARCHIPELAGO", 1);
    expect(selectPhysicSvgHit([largeIsland, tinyRegional, smallIsland], getBox).selected)
      .toBe(smallIsland);
  });

  it("retains smallest-bbox selection for weather", () => {
    const large = hit("Biome Big", 100);
    const small = hit("Biome Small", 1);
    expect(selectBiomeSvgHit("weather", [large, small], getBox).selected).toBe(small);
  });
});
