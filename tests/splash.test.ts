import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import splash from "@/content/splash.json";

describe("iOS launch images", () => {
  it("lists an existing portrait image for each device size", () => {
    expect(splash.length).toBeGreaterThanOrEqual(10);
    for (const { url, media } of splash) {
      expect(existsSync(join(process.cwd(), "public", url))).toBe(true);
      expect(media).toMatch(/^\(device-width: \d+px\) and \(device-height: \d+px\) and \(-webkit-device-pixel-ratio: [23]\) and \(orientation: portrait\)$/);
    }
  });
});
