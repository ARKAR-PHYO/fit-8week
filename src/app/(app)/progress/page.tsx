import { Suspense } from "react";
import { SignOutButton } from "@/components/SignOutButton";
import { ProgressView } from "./ProgressView";

export default function ProgressPage() {
  return (
    <div className="space-y-6">
      <Suspense fallback={<p className="text-sm text-neutral-500">Loading progress…</p>}>
        <ProgressView />
      </Suspense>
      <div className="text-center">
        <SignOutButton />
      </div>
    </div>
  );
}
