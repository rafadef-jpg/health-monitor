import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import type { DbClient, SupabaseUserIdentity } from "../types";

export function createUsersRepository(db: DbClient = prisma) {
  return {
    findById(id: string) {
      return db.user.findUnique({
        where: { id },
      });
    },

    findByEmail(email: string) {
      return db.user.findUnique({
        where: { email },
      });
    },

    upsertFromSupabaseAuth(input: SupabaseUserIdentity) {
      return db.user.upsert({
        where: { id: input.id },
        create: {
          id: input.id,
          email: input.email,
          name: input.name,
          timezone: input.timezone ?? "America/Sao_Paulo",
        },
        update: {
          email: input.email,
          name: input.name,
          timezone: input.timezone,
        },
      });
    },

    updateProfile(id: string, data: Prisma.UserUpdateInput) {
      return db.user.update({
        where: { id },
        data,
      });
    },

    softDelete(id: string) {
      return db.user.update({
        where: { id },
        data: {
          deletedAt: new Date(),
        },
      });
    },
  };
}
