import { prisma } from "../prisma";
import { createUsersRepository } from "../repositories/users.repository";
import type { SupabaseUserIdentity } from "../types";

export function createUsersService() {
  const users = createUsersRepository(prisma);

  return {
    ensureSupabaseUser(input: SupabaseUserIdentity) {
      return users.upsertFromSupabaseAuth(input);
    },

    getProfile(userId: string) {
      return users.findById(userId);
    },
  };
}
