"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guard";
import { logAudit } from "@/lib/audit";
import {
  interestSettingsSchema,
  ratePlansBulkSchema,
  featureFlagsSchema,
  openaiApiKeySchema,
  type InterestSettingsInput,
  type RatePlanInput,
  type FeatureFlagsInput,
  type OpenAIApiKeyInput,
} from "@/lib/validations/settings";
import { getInterestSettings, getFeatureFlags } from "@/lib/settings";
import { encryptSecret } from "@/lib/crypto";

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
  const flags = featureFlagsSchema.parse(input);

  const before = await getFeatureFlags();
  const after = await prisma.featureFlags.update({
    where: { id: before.id },
    data: { ...flags, updatedById: session.user.id },
  });

  await logAudit({
    userId: session.user.id,
    action: "UPDATE_FEATURE_FLAGS",
    entityType: "FeatureFlags",
    entityId: before.id,
    before: { aiSuiteEnabled: before.aiSuiteEnabled, payoutTrackingEnabled: before.payoutTrackingEnabled },
    after: { aiSuiteEnabled: after.aiSuiteEnabled, payoutTrackingEnabled: after.payoutTrackingEnabled },
  });

  revalidatePath("/settings/platform");
  revalidatePath("/dashboard");
  revalidatePath("/investments");
  // Strip the encrypted key before this crosses back over the wire to the client — it's never needed there.
  return { aiSuiteEnabled: after.aiSuiteEnabled, payoutTrackingEnabled: after.payoutTrackingEnabled };
}

// Admin or super admin — the API key is an integration credential, not a platform-wide toggle,
// so it doesn't need the same super-admin-only restriction as the feature flags above.
export async function saveOpenAIApiKey(input: OpenAIApiKeyInput) {
  const session = await requireRole([...ADMIN_ROLES]);
  const { openaiApiKey, clearOpenaiApiKey } = openaiApiKeySchema.parse(input);

  const before = await getFeatureFlags();
  const apiKeyUpdate = clearOpenaiApiKey
    ? { openaiApiKeyEncrypted: null }
    : openaiApiKey
      ? { openaiApiKeyEncrypted: encryptSecret(openaiApiKey) }
      : {};

  await prisma.featureFlags.update({
    where: { id: before.id },
    data: { ...apiKeyUpdate, updatedById: session.user.id },
  });

  // Never write the key itself (plaintext or encrypted) to the audit trail — only whether it changed.
  await logAudit({
    userId: session.user.id,
    action: "UPDATE_OPENAI_API_KEY",
    entityType: "FeatureFlags",
    entityId: before.id,
    after: { openaiApiKeyChanged: "openaiApiKeyEncrypted" in apiKeyUpdate },
  });

  revalidatePath("/settings");
  revalidatePath("/settings/platform");
}
