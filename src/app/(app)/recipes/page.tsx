import Image from "next/image";
import Link from "next/link";
import { MEAL_IMAGE_SIZE, recipeImage } from "@/content/images";
import { KITCHEN_RULES, RECIPES, type Recipe } from "@/content/recipes";
import { Card, PageTitle } from "@/components/ui";

const GROUPS: { title: string; kinds: Recipe["kind"][] }[] = [
  { title: "Breakfasts", kinds: ["breakfast"] },
  { title: "Lunch and dinner", kinds: ["main", "guide"] },
  { title: "Side", kinds: ["side"] },
];

export default function RecipesPage() {
  return (
    <div className="space-y-4">
      <PageTitle sub="Same portions as the meal plan. All fish-free.">Recipes</PageTitle>
      {GROUPS.map((group) => (
        <Card key={group.title} title={group.title}>
          <ul className="divide-y divide-black/5 dark:divide-white/10">
            {RECIPES.filter((r) => group.kinds.includes(r.kind)).map((r) => (
              <li key={r.id}>
                <Link href={`/recipes/${r.id}`} className="flex items-center gap-3 py-3">
                  {recipeImage(r.id) ? (
                    <Image
                      src={recipeImage(r.id)!}
                      alt=""
                      width={MEAL_IMAGE_SIZE.width}
                      height={MEAL_IMAGE_SIZE.height}
                      unoptimized
                      className="h-12 w-16 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <span className="h-12 w-16 shrink-0 rounded-lg bg-emerald-50 dark:bg-emerald-950" aria-hidden="true" />
                  )}
                  <span className="min-w-0">
                    <span className="block font-medium">{r.title}</span>
                    <span className="block text-xs text-neutral-500">{r.usedOn}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ))}
      <Card title="Kitchen rules">
        <ul className="list-disc space-y-1.5 pl-5 text-sm">
          {KITCHEN_RULES.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
