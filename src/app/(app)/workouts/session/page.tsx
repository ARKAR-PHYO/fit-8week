import { Suspense } from "react";
import { SessionView } from "./SessionView";

export default function SessionPage() {
  return (
    <Suspense fallback={<p className="text-sm text-neutral-500">Loading session…</p>}>
      <SessionView />
    </Suspense>
  );
}
