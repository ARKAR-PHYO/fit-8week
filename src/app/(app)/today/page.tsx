import { Suspense } from "react";
import { TodaySkeleton } from "@/components/Skeleton";
import { TodayView } from "./TodayView";

export default function TodayPage() {
  return (
    <Suspense fallback={<TodaySkeleton />}>
      <TodayView />
    </Suspense>
  );
}
