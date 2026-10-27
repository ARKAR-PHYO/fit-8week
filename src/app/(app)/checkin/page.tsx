import { Suspense } from "react";
import { CheckinView } from "./CheckinView";

export default function CheckinPage() {
  return (
    <Suspense fallback={<p className="text-sm text-neutral-500">Loading check-in…</p>}>
      <CheckinView />
    </Suspense>
  );
}
