import { Suspense } from "react";
import { SignOutButton } from "@/components/SignOutButton";
import { ProgressSkeleton } from "@/components/Skeleton";
import { ProgressView } from "./ProgressView";

export default function ProgressPage() {
  return (
    <div className="space-y-6">
      <Suspense fallback={<ProgressSkeleton />}>
        <ProgressView />
      </Suspense>
      <div className="text-center">
        <SignOutButton />
      </div>
    </div>
  );
}
