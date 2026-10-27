import { Suspense } from "react";
import { DetailSkeleton } from "@/components/Skeleton";
import { SessionView } from "./SessionView";

export default function SessionPage() {
  return (
    <Suspense fallback={<DetailSkeleton label="Loading session" />}>
      <SessionView />
    </Suspense>
  );
}
