"use server";

import { signIn, signOut } from "@/auth";

/** Only same-site relative paths are allowed as a post-login destination. */
function safeRedirect(path: unknown): string {
  if (typeof path !== "string" || !path.startsWith("/") || path.startsWith("//")) return "/today";
  return path;
}

export async function signInAction(formData: FormData) {
  await signIn("google", { redirectTo: safeRedirect(formData.get("callbackUrl")) });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}
