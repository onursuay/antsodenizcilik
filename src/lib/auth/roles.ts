import type { User } from "@supabase/supabase-js";

export const ROLES = {
  USER: "user",
  ADMIN: "admin",
  OPS: "ops",
  OPERATOR: "operator",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export function getUserRole(user: User): Role {
  const role = user.app_metadata?.role;
  if (
    role === ROLES.ADMIN ||
    role === ROLES.OPS ||
    role === ROLES.OPERATOR
  ) {
    return role;
  }
  return ROLES.USER;
}
