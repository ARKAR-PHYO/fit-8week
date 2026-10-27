import { Suspense } from "react";
import { FormSkeleton } from "@/components/Skeleton";
import { CheckinView } from "./CheckinView";

export default function CheckinPage() {
  return (
    <Suspense fallback={<FormSkeleton label="Loading check-in" />}>
      <CheckinView />
    </Suspense>
  );
}
