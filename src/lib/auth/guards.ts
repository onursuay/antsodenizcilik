import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getUserRole, ROLES } from "./roles";

export class AuthError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export async function requireAuth(supabase: SupabaseClient): Promise<User> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new AuthError("Unauthorized", 401);
  }

  return user;
}

export async function requireAdmin(supabase: SupabaseClient): Promise<User> {
  const user = await requireAuth(supabase);
  const role = getUserRole(user);

  if (role !== ROLES.ADMIN) {
    throw new AuthError("Forbidden: admin role required", 403);
  }

  return user;
}

export async function requireOps(supabase: SupabaseClient): Promise<User> {
  const user = await requireAuth(supabase);
  const role = getUserRole(user);

  if (role !== ROLES.ADMIN && role !== ROLES.OPS) {
    throw new AuthError("Forbidden: ops or admin role required", 403);
  }

  return user;
}

export async function requireOperator(supabase: SupabaseClient): Promise<User> {
  const user = await requireAuth(supabase);
  const role = getUserRole(user);

  if (role !== ROLES.ADMIN && role !== ROLES.OPERATOR) {
    throw new AuthError("Forbidden: operator or admin role required", 403);
  }

  return user;
}
