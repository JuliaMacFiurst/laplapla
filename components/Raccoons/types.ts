export type EntitySearchResult = {
  route: "country" | "animal" | "river" | "sea" | "biome";
  slug: string;
  href: string;
  title: string;
  targetId: string;
};
