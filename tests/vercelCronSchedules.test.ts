import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

type VercelConfig = {
  crons?: Array<{ path?: unknown; schedule?: unknown }>;
};

describe("Vercel Hobby cron schedules", () => {
  it("configures each route at most once per day", async () => {
    const config = JSON.parse(
      await readFile(new URL("../vercel.json", import.meta.url), "utf8"),
    ) as VercelConfig;
    const crons = config.crons ?? [];
    const paths = new Set<string>();

    expect(crons.length).toBeGreaterThan(0);
    for (const cron of crons) {
      expect(typeof cron.path).toBe("string");
      expect(typeof cron.schedule).toBe("string");
      expect(paths.has(cron.path as string)).toBe(false);
      paths.add(cron.path as string);

      const fields = (cron.schedule as string).trim().split(/\s+/u);
      expect(fields).toHaveLength(5);
      const [minute, hour] = fields;
      expect(minute).toMatch(/^(?:[0-5]?\d)$/u);
      expect(hour).toMatch(/^(?:[01]?\d|2[0-3])$/u);
    }
  });
});
