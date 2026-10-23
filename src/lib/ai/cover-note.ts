import Anthropic from "@anthropic-ai/sdk";
import { getFeatureFlags } from "@/lib/settings";
import { formatDate } from "@/lib/format";

interface CoverNoteInput {
  clientName: string;
  principalAmount: number;
  tenureYears: number;
  ratePercent: number;
  rateBasis: "MONTHLY" | "ANNUAL";
  payoutType: "INTEREST_ONLY" | "AMORTIZING";
  startDate: Date;
  maturityDate: Date;
  firstPayout: number;
  totalPayout: number;
  /** Lets the caller control how currency is rendered in the output medium (e.g. the PDF's base-14 fonts can't render ₹). */
  formatCurrency: (amount: number) => string;
}

function templatedCoverNote(input: CoverNoteInput): string {
  const money = input.formatCurrency;
  const rateLabel = `${input.ratePercent}% ${input.rateBasis === "MONTHLY" ? "per month" : "per annum"}`;
  const structure =
    input.payoutType === "INTEREST_ONLY"
      ? `a fixed monthly payout of ${money(input.firstPayout)}, with your full principal returned at maturity`
      : `a fixed monthly installment of ${money(input.firstPayout)} that includes both interest and principal`;

  return (
    `Dear ${input.clientName}, thank you for investing ${money(input.principalAmount)} with Sirah Digital's ` +
    `commodity trading desk. Your investment runs for ${input.tenureYears} years at ${rateLabel}, structured as ${structure}. ` +
    `The schedule below details every installment from ${formatDate(input.startDate)} through maturity on ` +
    `${formatDate(input.maturityDate)}, for a total projected payout of ${money(input.totalPayout)}.`
  );
}

export async function generateCoverNote(input: CoverNoteInput): Promise<{ text: string; aiGenerated: boolean }> {
  const flags = await getFeatureFlags();
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!flags.aiSuiteEnabled || !apiKey) {
    return { text: templatedCoverNote(input), aiGenerated: false };
  }

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: "claude-sonnet-5-5",
      max_tokens: 220,
      messages: [
        {
          role: "user",
          content:
            "Write a short (3-4 sentence), warm, professional cover note for a client's investment statement PDF. " +
            "Plain language, no markdown, no greeting beyond 'Dear <name>,'. Mention the principal, tenure, rate, " +
            "payout structure, and maturity date naturally in prose. Facts (use exactly these, do not alter the numbers):\n" +
            JSON.stringify(
              {
                clientName: input.clientName,
                principal: input.formatCurrency(input.principalAmount),
                tenureYears: input.tenureYears,
                rate: `${input.ratePercent}% ${input.rateBasis === "MONTHLY" ? "per month" : "per annum"}`,
                payoutType: input.payoutType === "INTEREST_ONLY" ? "interest-only, principal returned at maturity" : "amortizing (EMI-style)",
                firstPayout: input.formatCurrency(input.firstPayout),
                startDate: formatDate(input.startDate),
                maturityDate: formatDate(input.maturityDate),
                totalPayout: input.formatCurrency(input.totalPayout),
              },
              null,
              2
            ),
        },
      ],
    });

    const text = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join(" ")
      .trim();

    if (!text) return { text: templatedCoverNote(input), aiGenerated: false };
    return { text, aiGenerated: true };
  } catch {
    // AI is a nice-to-have on an exported document — never block the export because the model call failed.
    return { text: templatedCoverNote(input), aiGenerated: false };
  }
}
