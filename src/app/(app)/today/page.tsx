import { Suspense } from "react";
import { TodayView } from "./TodayView";

export default function TodayPage() {
  return (
    <Suspense fallback={<p className="text-sm text-neutral-500">Loading today…</p>}>
      <TodayView />
    </Suspense>
  );
}
