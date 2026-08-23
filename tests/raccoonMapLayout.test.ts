import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const worldMapCss = readFileSync("styles/WorldMap.css", "utf8");
const raccoonsPage = readFileSync("pages/raccoons.tsx", "utf8");
const mapEngine = readFileSync(
  "components/Raccoons/InteractiveMapEngine.tsx",
  "utf8",
);

describe("raccoon map shared responsive layout", () => {
  it("keeps search controls and the map in one document-flow layout", () => {
    expect(raccoonsPage).toContain('className="raccoons-map-layout"');
    expect(raccoonsPage).toContain('data-testid="raccoons-map-search"');
    expect(raccoonsPage).toContain('data-testid="raccoons-map-region"');
    expect(worldMapCss).toMatch(
      /\.raccoons-map-layout\s*\{[\s\S]*grid-template-rows:\s*auto minmax\(0, auto\);[\s\S]*overflow-x:\s*clip;/,
    );
  });

  it("clips transformed SVG artwork inside the shared map viewport", () => {
    expect(worldMapCss).toMatch(
      /\.map-container\s*\{[\s\S]*overflow:\s*hidden;[\s\S]*isolation:\s*isolate;/,
    );
  });

  it("does not force mobile SVG maps into a persistent composited texture", () => {
    expect(worldMapCss).toMatch(
      /\.map-content--mobile\s*\{[\s\S]*will-change:\s*auto;/,
    );
  });

  it("keeps the desktop transform branch and selected-country styling unchanged", () => {
    expect(mapEngine).toContain(
      ": `translate3d(${nextX}px, ${nextY}px, 0) scale(${nextZoom})`",
    );
    expect(worldMapCss).toMatch(
      /\.country-map \.country\[data-selected="true"\][\s\S]*fill:\s*#e0d4f7 !important;/,
    );
  });

  it.each(["FlagMap.tsx", "CultureMap.tsx", "FoodMap.tsx"])(
    "%s uses the shared country-map engine",
    (fileName) => {
      const source = readFileSync(`components/Raccoons/maps/${fileName}`, "utf8");
      expect(source).toContain("<InteractiveMapEngine");
      expect(source).toContain('svgPath="countries/countries_interactive.svg"');
    },
  );
});
