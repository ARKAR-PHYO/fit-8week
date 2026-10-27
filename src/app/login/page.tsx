import { Suspense } from "react";
import { signInAction } from "@/app/actions";
import { buttonClass } from "@/components/ui";

export const metadata = { title: "Sign in · 8-Week Plan" };

const ERRORS: Record<string, string> = {
  AccessDenied: "That Google account isn't allowed to use this app.",
  Configuration: "Sign-in isn't configured yet. Check the environment variables in Vercel.",
};

async function LoginForm({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const params = await searchParams;
  const callbackUrl = typeof params.callbackUrl === "string" ? params.callbackUrl : "/today";
  const error = typeof params.error === "string" ? (ERRORS[params.error] ?? "Sign-in failed. Try again.") : null;

  return (
    <form action={signInAction} className="space-y-3">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      {error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">{error}</p>}
      <button type="submit" className={`${buttonClass} w-full py-3 text-base`}>
        Sign in with Google
      </button>
    </form>
  );
}

export default function LoginPage(props: PageProps<"/login">) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6">
      <h1 className="text-3xl font-semibold tracking-tight">8-Week Plan</h1>
      <p className="mb-8 mt-2 text-neutral-500">Meals, workouts and progress. Private to you.</p>
      <Suspense fallback={null}>
        <LoginForm searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}
