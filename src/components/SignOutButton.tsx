"use client";

import { useTransition } from "react";
import { clearDevice, pendingOps } from "@/lib/client/store";
import { signOutAction } from "@/app/actions";

export function SignOutButton() {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className="text-sm text-neutral-500 underline disabled:opacity-50 dark:text-neutral-400"
      onClick={() =>
        start(async () => {
          const unsynced = (await pendingOps()).length;
          if (unsynced > 0 && !confirm(`${unsynced} change(s) haven't synced yet and will be lost. Sign out anyway?`)) {
            return;
          }
          // Remove cached health data from this device before ending the session.
          await clearDevice();
          await signOutAction();
        })
      }
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
