import "server-only";
import { auth, isAllowedEmail } from "@/auth";

export class UnauthorizedError extends Error {
  constructor() {
    super("unauthorized");
  }
}

/**
 * Data Access Layer guard. Call at the top of every route handler or server action that
 * reads or writes the Sheet. Re-checks the allowlist so removing an email from
 * ALLOWED_EMAILS locks it out even while its 30-day session cookie is still valid.
 */
export async function requireUser(): Promise<{ email: string }> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email || !isAllowedEmail(email)) throw new UnauthorizedError();
  return { email: email.toLowerCase() };
}
