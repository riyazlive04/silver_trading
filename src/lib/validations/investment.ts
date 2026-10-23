import { z } from "zod";

/** `minimumInvestment` comes from the admin-configured InterestSettings — never hardcode it in forms. */
export function createInvestmentSchema(minimumInvestment: number) {
  return z.object({
    clientId: z.string().min(1, "Select a client."),
    principalAmount: z
      .number({ error: "Enter an amount." })
      .positive("Enter an amount.")
      .min(
        minimumInvestment,
        `Minimum investment is ₹${minimumInvestment.toLocaleString("en-IN")}.`
      ),
    tenureYears: z.number({ error: "Select a tenure." }).int("Tenure must be a whole number of years.").positive("Select a tenure."),
    startDate: z.string().min(1, "Select a start date."),
    notes: z.string().trim().max(2000).optional(),
  });
}

export type InvestmentInput = z.infer<ReturnType<typeof createInvestmentSchema>>;
