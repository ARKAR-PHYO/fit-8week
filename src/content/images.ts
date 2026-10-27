import { MEALS, MENU, type Meal } from "@/content/menu";
import { WEEKDAYS, type Weekday } from "@/lib/plan";

/**
 * Dish photos live in public/meals/{weekday}-{meal}.webp, one per menu slot (cropped from the
 * daily menu cards). Every slot has a photo, including snacks without a recipe.
 */
export const MEAL_IMAGE_SIZE = { width: 521, height: 391 } as const;

export function mealImage(day: Weekday, meal: Meal): string {
  return `/meals/${day}-${meal}.webp`;
}

/**
 * One photo per recipe for the recipe pages. Some recipes appear on several days (soy eggs,
 * tomato and egg, steamed egg); main meals are preferred over snacks, then the earliest day.
 */
const ORDER: Meal[] = ["breakfast", "lunch", "dinner", "snack"];

export function recipeImage(recipeId: string): string | null {
  for (const meal of ORDER) {
    for (const day of WEEKDAYS) {
      if (MENU[day][meal].recipeId === recipeId) return mealImage(day, meal);
    }
  }
  return null;
}

/** Every slot, for checks that each photo file exists. */
export function allMealImages(): string[] {
  return WEEKDAYS.flatMap((d) => MEALS.map((m) => mealImage(d, m)));
}
