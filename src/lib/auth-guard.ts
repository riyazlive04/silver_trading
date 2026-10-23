import { auth } from "@/auth";
import type { AppRole } from "@/types/next-auth";

export class ForbiddenError extends Error {
  constructor(message = "You don't have permission to do that.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class UnauthenticatedError extends Error {
  constructor(message = "You must be signed in.") {
    super(message);
    this.name = "UnauthenticatedError";
  }
}

/** Use inside server actions / route handlers. Throws if there's no session. */
export async function requireSession() {
  const session = await auth();
  if (!session?.user) throw new UnauthenticatedError();
  return session;
}

/** Use inside server actions / route handlers after requireSession(). Throws if the role isn't allowed. */
export function assertRole(role: AppRole, allowed: AppRole[]) {
  if (!allowed.includes(role)) throw new ForbiddenError();
}

export async function requireRole(allowed: AppRole[]) {
  const session = await requireSession();
  assertRole(session.user.role, allowed);
  return session;
}
