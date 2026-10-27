import type { Weekday } from "@/lib/plan";

export const MEALS = ["breakfast", "lunch", "snack", "dinner"] as const;
export type Meal = (typeof MEALS)[number];

export const MEAL_LABELS: Record<Meal, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  snack: "Snack",
  dinner: "Dinner",
};

export interface MenuItem {
  title: string;
  recipeId?: string;
  /** True when this meal carries the protein top-up (1 egg + 80 g chicken). */
  topUp?: boolean;
}

export type DayMenu = Record<Meal, MenuItem>;

export const MENU: Record<Weekday, DayMenu> = {
  mon: {
    breakfast: { title: "Onion and turmeric omelette, rice, banana", recipeId: "turmeric-omelette" },
    lunch: { title: "Thai garlic-pepper chicken with cabbage", recipeId: "garlic-pepper-chicken" },
    snack: { title: "2 boiled eggs, cucumber with chili-lime salt" },
    dinner: { title: "Light chickpea chicken curry", recipeId: "chickpea-chicken-curry" },
  },
  tue: {
    breakfast: { title: "Tomato and egg stir-fry, rice, fruit", recipeId: "tomato-egg" },
    lunch: { title: "Ginger-scallion chicken with garlic greens", recipeId: "ginger-scallion-chicken", topUp: true },
    snack: { title: "2 soy eggs, banana", recipeId: "soy-eggs" },
    dinner: { title: "Mapo-style tofu with lentils", recipeId: "mapo-tofu-lentils" },
  },
  wed: {
    breakfast: { title: "Soy-marinated eggs, rice, fruit", recipeId: "soy-eggs" },
    lunch: { title: "Burmese turmeric chicken hin with long beans", recipeId: "turmeric-chicken-hin" },
    snack: { title: "2 boiled eggs" },
    dinner: { title: "Chicken, lentil and pumpkin lemongrass soup", recipeId: "lentil-pumpkin-soup" },
  },
  thu: {
    breakfast: { title: "Rice-cooker steamed egg, rice, cucumber", recipeId: "steamed-egg" },
    lunch: { title: "Air-fryer chicken with chickpea thoke", recipeId: "air-fryer-chicken-thoke", topUp: true },
    snack: { title: "2 eggs, banana" },
    dinner: { title: "Yellow curry tofu with lentils", recipeId: "yellow-curry-tofu" },
  },
  fri: {
    breakfast: { title: "Soy-marinated eggs, rice, banana", recipeId: "soy-eggs" },
    lunch: { title: "Black-pepper chicken with onion and capsicum", recipeId: "black-pepper-chicken" },
    snack: { title: "2 eggs, cucumber" },
    dinner: { title: "Thai basil chicken and lentil stir-fry", recipeId: "basil-chicken-lentils" },
  },
  sat: {
    breakfast: { title: "Tomato and egg stir-fry, rice, fruit", recipeId: "tomato-egg" },
    lunch: { title: "Family chicken curry with garlic greens", recipeId: "family-curry-guide" },
    snack: { title: "2 boiled eggs, or 1 egg and a banana" },
    dinner: { title: "Air-fryer crispy tofu with chickpea tomato thoke", recipeId: "crispy-tofu-thoke" },
  },
  sun: {
    breakfast: { title: "Rice-cooker steamed egg, rice, fruit", recipeId: "steamed-egg" },
    lunch: { title: "Chicken larb with fresh vegetables", recipeId: "chicken-larb", topUp: true },
    snack: { title: "2 eggs, fruit or cucumber" },
    dinner: { title: "Hot and sour tofu and lentil soup", recipeId: "hot-sour-tofu-soup" },
  },
};

export const DAILY_TARGETS = {
  kcal: "1,900–2,100 kcal",
  protein: "130–150 g protein",
  water: "2.5–3 L water",
  oil: "10–15 ml sunflower oil",
};
