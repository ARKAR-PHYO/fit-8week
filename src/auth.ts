import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

/**
 * Only emails in ALLOWED_EMAILS can sign in. Comma-separated, case-insensitive.
 * Example: ALLOWED_EMAILS=michael@luncreative.com
 */
export function allowedEmails(): Set<string> {
  return new Set(
    (process.env.ALLOWED_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAllowedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return allowedEmails().has(email.toLowerCase());
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login", error: "/login" },
  trustHost: true,
  callbacks: {
    signIn({ account, profile }) {
      if (account?.provider !== "google") return false;
      // Google marks Workspace and Gmail addresses it has verified.
      if (profile?.email_verified !== true) return false;
      return isAllowedEmail(profile?.email);
    },
    // Used by the proxy: any signed-in session passes; the allowlist was checked at sign-in
    // and is checked again in requireUser() before any data is read or written.
    authorized({ auth }) {
      return !!auth?.user;
    },
  },
});
