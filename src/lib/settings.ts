import { prisma } from "@/lib/prisma";
import type { FeatureFlags, InterestSettings, RatePlan } from "@prisma/client";
import { decryptSecret, maskSecret } from "@/lib/crypto";

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

/**
 * Resolves the OpenAI API key to use for AI features: an admin-configured key
 * (encrypted in the DB) takes precedence, falling back to OPENAI_API_KEY in the
 * server environment. Never expose the return value to the client.
 */
export async function getOpenAIApiKey(): Promise<string | null> {
  const flags = await getFeatureFlags();
  if (flags.openaiApiKeyEncrypted) {
    try {
      return decryptSecret(flags.openaiApiKeyEncrypted);
    } catch {
      // Falls through to the env var if the stored value can't be decrypted
      // (e.g. AUTH_SECRET rotated) rather than hard-failing the request.
    }
  }
  return process.env.OPENAI_API_KEY || null;
}

/** Masked preview for the settings UI — e.g. "••••••••ab12", or null if nothing is configured. */
export async function getOpenAIApiKeyMasked(): Promise<string | null> {
  const key = await getOpenAIApiKey();
  return key ? maskSecret(key) : null;
}
