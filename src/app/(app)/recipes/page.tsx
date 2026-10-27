import Link from "next/link";
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
                <Link href={`/recipes/${r.id}`} className="block py-3">
                  <span className="block font-medium">{r.title}</span>
                  <span className="block text-xs text-neutral-500">{r.usedOn}</span>
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
