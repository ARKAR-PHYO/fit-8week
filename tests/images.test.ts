import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { allMealImages, mealImage, recipeImage } from "@/content/images";
import { RECIPES } from "@/content/recipes";

describe("meal images", () => {
  it("has a photo file for every day and meal", () => {
    const missing = allMealImages().filter((p) => !existsSync(join(process.cwd(), "public", p)));
    expect(missing).toEqual([]);
    expect(allMealImages()).toHaveLength(28);
  });

  it("gives every recipe on the menu a photo; only the garlic greens side has none", () => {
    const without = RECIPES.filter((r) => recipeImage(r.id) === null).map((r) => r.id);
    expect(without).toEqual(["garlic-greens"]);
  });

  it("prefers a main meal over a snack for shared recipes", () => {
    // Soy eggs are Tuesday's snack and Wednesday/Friday breakfast: use Wednesday breakfast.
    expect(recipeImage("soy-eggs")).toBe(mealImage("wed", "breakfast"));
    expect(recipeImage("tomato-egg")).toBe(mealImage("tue", "breakfast"));
    expect(recipeImage("chicken-larb")).toBe(mealImage("sun", "lunch"));
  });
});
