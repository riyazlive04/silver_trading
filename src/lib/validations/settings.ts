import { z } from "zod";

export const interestSettingsSchema = z.object({
  rateBasis: z.enum(["MONTHLY", "ANNUAL"]),
  payoutType: z.enum(["INTEREST_ONLY", "AMORTIZING"]),
  minimumInvestment: z.number().positive("Minimum investment must be greater than zero."),
});
export type InterestSettingsInput = z.infer<typeof interestSettingsSchema>;

export const ratePlanSchema = z.object({
  id: z.string().optional(),
  tenureYears: z.number().positive().nullable(),
  label: z.string().trim().min(1, "Label is required."),
  ratePercent: z.number().min(0, "Rate can't be negative.").max(100, "That rate looks too high."),
  isActive: z.boolean(),
  sortOrder: z.number().int(),
});
export type RatePlanInput = z.infer<typeof ratePlanSchema>;

export const ratePlansBulkSchema = z.array(ratePlanSchema);

export const featureFlagsSchema = z.object({
  aiSuiteEnabled: z.boolean(),
  payoutTrackingEnabled: z.boolean(),
});
export type FeatureFlagsInput = z.infer<typeof featureFlagsSchema>;

export const openaiApiKeySchema = z.object({
  // Plaintext from the form; omitted/empty means "leave the stored key unchanged".
  openaiApiKey: z.string().trim().optional(),
  clearOpenaiApiKey: z.boolean().optional(),
});
export type OpenAIApiKeyInput = z.infer<typeof openaiApiKeySchema>;
