import { prisma } from "@/lib/prisma";
import type { FeatureFlags, InterestSettings, RatePlan } from "@prisma/client";
import { logAudit } from "@/lib/audit";

/** These singletons are ensured to exist by the seed script; these getters are a defensive fallback. */
export async function getInterestSettings(): Promise<InterestSettings> {
  const existing = await prisma.interestSettings.findFirst();
  if (existing) return existing;
  return prisma.interestSettings.create({ data: {} });
}

export async function getFeatureFlags(): Promise<FeatureFlags> {
  const existing = await prisma.featureFlags.findFirst();
  if (existing) return existing;
  return prisma.featureFlags.create({ data: {} });
}

export async function getActiveRatePlans(): Promise<RatePlan[]> {
  return prisma.ratePlan.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } });
}

export async function updateInterestSettings(
  userId: string,
  data: Partial<Pick<InterestSettings, "rateBasis" | "payoutType" | "minimumInvestment">>
) {
  const before = await getInterestSettings();
  const after = await prisma.interestSettings.update({
    where: { id: before.id },
    data: { ...data, updatedById: userId },
  });
  await logAudit({
    userId,
    action: "UPDATE_INTEREST_SETTINGS",
    entityType: "InterestSettings",
    entityId: before.id,
    before,
    after,
  });
  return after;
}

export async function updateFeatureFlags(
  userId: string,
  data: Partial<Pick<FeatureFlags, "aiSuiteEnabled" | "payoutTrackingEnabled">>
) {
  const before = await getFeatureFlags();
  const after = await prisma.featureFlags.update({
    where: { id: before.id },
    data: { ...data, updatedById: userId },
  });
  await logAudit({
    userId,
    action: "UPDATE_FEATURE_FLAGS",
    entityType: "FeatureFlags",
    entityId: before.id,
    before,
    after,
  });
  return after;
}
