"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guard";
import { logAudit } from "@/lib/audit";
import {
  interestSettingsSchema,
  ratePlansBulkSchema,
  featureFlagsSchema,
  type InterestSettingsInput,
  type RatePlanInput,
  type FeatureFlagsInput,
} from "@/lib/validations/settings";
import { getInterestSettings, getFeatureFlags } from "@/lib/settings";

const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"] as const;

export async function saveInterestSettings(input: InterestSettingsInput) {
  const session = await requireRole([...ADMIN_ROLES]);
  const data = interestSettingsSchema.parse(input);

  const before = await getInterestSettings();
  const after = await prisma.interestSettings.update({
    where: { id: before.id },
    data: { ...data, updatedById: session.user.id },
  });

  await logAudit({
    userId: session.user.id,
    action: "UPDATE_INTEREST_SETTINGS",
    entityType: "InterestSettings",
    entityId: before.id,
    before,
    after,
  });

  revalidatePath("/settings");
  return after;
}

export async function saveRatePlans(input: RatePlanInput[]) {
  const session = await requireRole([...ADMIN_ROLES]);
  const data = ratePlansBulkSchema.parse(input);

  const before = await prisma.ratePlan.findMany({ orderBy: { sortOrder: "asc" } });

  const results = await prisma.$transaction(
    data.map((plan) =>
      plan.id
        ? prisma.ratePlan.update({
            where: { id: plan.id },
            data: {
              tenureYears: plan.tenureYears,
              label: plan.label,
              ratePercent: plan.ratePercent,
              isActive: plan.isActive,
              sortOrder: plan.sortOrder,
            },
          })
        : prisma.ratePlan.create({
            data: {
              tenureYears: plan.tenureYears,
              label: plan.label,
              ratePercent: plan.ratePercent,
              isActive: plan.isActive,
              sortOrder: plan.sortOrder,
            },
          })
    )
  );

  await logAudit({
    userId: session.user.id,
    action: "UPDATE_RATE_PLANS",
    entityType: "RatePlan",
    before,
    after: results,
  });

  revalidatePath("/settings");
  return results;
}

export async function saveFeatureFlags(input: FeatureFlagsInput) {
  const session = await requireRole(["SUPER_ADMIN"]);
  const data = featureFlagsSchema.parse(input);

  const before = await getFeatureFlags();
  const after = await prisma.featureFlags.update({
    where: { id: before.id },
    data: { ...data, updatedById: session.user.id },
  });

  await logAudit({
    userId: session.user.id,
    action: "UPDATE_FEATURE_FLAGS",
    entityType: "FeatureFlags",
    entityId: before.id,
    before,
    after,
  });

  revalidatePath("/settings/platform");
  revalidatePath("/dashboard");
  revalidatePath("/investments");
  return after;
}
