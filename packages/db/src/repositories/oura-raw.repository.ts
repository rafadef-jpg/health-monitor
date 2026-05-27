import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import type { DbClient, OuraRawInput } from "../types";

export function createOuraRawRepository(db: DbClient = prisma) {
  return {
    upsertRaw(input: OuraRawInput) {
      return db.ouraRaw.upsert({
        where: {
          userId_collection_externalId: {
            userId: input.userId,
            collection: input.collection,
            externalId: input.externalId,
          },
        },
        create: input,
        update: {
          metricDate: input.metricDate,
          recordedAt: input.recordedAt,
          payload: input.payload,
          checksum: input.checksum,
          ingestedAt: new Date(),
        },
      });
    },

    createMany(data: Prisma.OuraRawCreateManyInput[]) {
      return db.ouraRaw.createMany({
        data,
        skipDuplicates: true,
      });
    },

    findByCollection(userId: string, collection: string, take = 100) {
      return db.ouraRaw.findMany({
        where: {
          userId,
          collection,
        },
        orderBy: {
          ingestedAt: "desc",
        },
        take,
      });
    },
  };
}
