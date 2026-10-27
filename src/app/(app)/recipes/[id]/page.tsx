import Image from "next/image";
import Link from "next/link";
import { MEAL_IMAGE_SIZE, recipeImage } from "@/content/images";
import { notFound } from "next/navigation";
import { getRecipe, RECIPES } from "@/content/recipes";
import { Card, PageTitle } from "@/components/ui";

export function generateStaticParams() {
  return RECIPES.map((r) => ({ id: r.id }));
}

export default async function RecipePage({ params }: PageProps<"/recipes/[id]">) {
  const { id } = await params;
  const recipe = getRecipe(id);
  if (!recipe) notFound();

  return (
    <div className="space-y-4">
      <Link href="/recipes" className="text-sm text-emerald-700 dark:text-emerald-400">
        ‹ All recipes
      </Link>
      <PageTitle sub={recipe.usedOn}>{recipe.title}</PageTitle>
      {recipeImage(recipe.id) && (
        <Image
          src={recipeImage(recipe.id)!}
          alt={recipe.title}
          width={MEAL_IMAGE_SIZE.width}
          height={MEAL_IMAGE_SIZE.height}
          priority
          unoptimized
          className="aspect-[4/3] w-full rounded-2xl object-cover"
        />
      )}
      <p className="text-sm text-neutral-600 dark:text-neutral-300">{recipe.summary}</p>
      {recipe.ingredients.length > 0 && (
        <Card title="Ingredients">
          <ul className="list-disc space-y-1.5 pl-5 text-[15px]">
            {recipe.ingredients.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </Card>
      )}
      <Card title={recipe.kind === "guide" ? "How to plate it" : "Method"}>
        <ol className="list-decimal space-y-3 pl-5 text-[15px]">
          {recipe.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
