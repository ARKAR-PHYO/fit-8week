import { describe, expect, it } from "vitest";
import { navyBodyFatMale } from "@/lib/bodyfat";

describe("navyBodyFatMale", () => {
  it("matches the published formula for a worked example", () => {
    // 495 / (1.0324 − 0.19077·log10(67) + 0.15456·log10(170.6)) − 450 ≈ 31.0
    expect(navyBodyFatMale(109, 42, 170.6)).toBe(31);
  });

  it("drops as the waist shrinks with the same neck and height", () => {
    const before = navyBodyFatMale(109, 42, 170.6)!;
    const after = navyBodyFatMale(105, 42, 170.6)!;
    expect(after).toBeLessThan(before);
    expect(after).toBe(28.7);
    expect(before - after).toBeCloseTo(2.3, 1);
  });

  it("returns null for missing or impossible inputs instead of a misleading number", () => {
    expect(navyBodyFatMale(null, 42, 170.6)).toBeNull();
    expect(navyBodyFatMale(109, undefined, 170.6)).toBeNull();
    expect(navyBodyFatMale(109, 42, null)).toBeNull();
    expect(navyBodyFatMale(40, 42, 170.6)).toBeNull(); // waist not larger than neck
    expect(navyBodyFatMale(109, 42, 17.06)).toBeNull(); // height entered in the wrong unit
    expect(navyBodyFatMale(Number.NaN, 42, 170.6)).toBeNull();
  });
});
