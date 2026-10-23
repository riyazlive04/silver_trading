// Pure calculation engine for investment repayment schedules.
// No DB/IO here — keeps this testable and reusable on both client (live preview) and server (persisted truth).

export type RateBasis = "MONTHLY" | "ANNUAL";
export type PayoutType = "INTEREST_ONLY" | "AMORTIZING";

export interface RatePlanLike {
  tenureYears: number | null;
  ratePercent: number;
  isActive: boolean;
}

export interface ResolvedRate {
  ratePercent: number;
  isFlatAboveMax: boolean;
}

/**
 * Finds the rate for a given tenure from the admin-configured slabs.
 * A plan with tenureYears === null is the flat rate applied to any tenure
 * beyond the highest explicitly defined slab (e.g. "10+ years -> 3.5%").
 */
export function resolveRate(tenureYears: number, ratePlans: RatePlanLike[]): ResolvedRate {
  const active = ratePlans.filter((p) => p.isActive);
  const exact = active.find((p) => p.tenureYears === tenureYears);
  if (exact) return { ratePercent: exact.ratePercent, isFlatAboveMax: false };

  const numeric = active.filter((p): p is RatePlanLike & { tenureYears: number } => p.tenureYears !== null);
  const maxDefined = numeric.reduce((max, p) => Math.max(max, p.tenureYears), 0);
  const flat = active.find((p) => p.tenureYears === null);

  if (tenureYears > maxDefined && flat) {
    return { ratePercent: flat.ratePercent, isFlatAboveMax: true };
  }

  throw new Error(
    `No rate plan found for a ${tenureYears}-year tenure. Available slabs: ${numeric
      .map((p) => p.tenureYears)
      .join(", ")}${flat ? `, >${maxDefined} (flat ${flat.ratePercent}%)` : ""}.`
  );
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export interface ScheduleEntry {
  installmentNo: number;
  dueDate: Date;
  openingBalance: number;
  interestAmount: number;
  principalAmount: number;
  totalPayout: number;
  closingBalance: number;
}

export interface ComputeScheduleInput {
  principal: number;
  tenureMonths: number;
  ratePercent: number;
  rateBasis: RateBasis;
  payoutType: PayoutType;
  startDate: Date;
}

export interface ComputeScheduleResult {
  entries: ScheduleEntry[];
  totalPayout: number;
  totalInterest: number;
  totalPrincipal: number;
  monthlyRate: number;
  /** Simple annualized return on the original principal, for display only. */
  effectiveAnnualizedReturnPercent: number;
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

/** Converts the admin-configured rate into the per-month decimal rate used in all schedule math. */
export function toMonthlyRate(ratePercent: number, rateBasis: RateBasis): number {
  const r = ratePercent / 100;
  return rateBasis === "MONTHLY" ? r : r / 12;
}

export function computeSchedule(input: ComputeScheduleInput): ComputeScheduleResult {
  const { principal, tenureMonths, ratePercent, rateBasis, payoutType, startDate } = input;

  if (principal <= 0) throw new Error("Principal must be greater than zero.");
  if (tenureMonths <= 0 || !Number.isInteger(tenureMonths)) {
    throw new Error("Tenure (months) must be a positive integer.");
  }

  const r = toMonthlyRate(ratePercent, rateBasis);
  const entries: ScheduleEntry[] =
    payoutType === "INTEREST_ONLY"
      ? buildInterestOnlySchedule(principal, tenureMonths, r, startDate)
      : buildAmortizingSchedule(principal, tenureMonths, r, startDate);

  const totalInterest = roundMoney(entries.reduce((sum, e) => sum + e.interestAmount, 0));
  const totalPrincipal = roundMoney(entries.reduce((sum, e) => sum + e.principalAmount, 0));
  const totalPayout = roundMoney(totalInterest + totalPrincipal);
  const years = tenureMonths / 12;
  const effectiveAnnualizedReturnPercent = years > 0 ? roundMoney((totalInterest / principal / years) * 100) : 0;

  return {
    entries,
    totalPayout,
    totalInterest,
    totalPrincipal,
    monthlyRate: r,
    effectiveAnnualizedReturnPercent,
  };
}

function buildInterestOnlySchedule(
  principal: number,
  tenureMonths: number,
  r: number,
  startDate: Date
): ScheduleEntry[] {
  const monthlyInterest = roundMoney(principal * r);
  const entries: ScheduleEntry[] = [];

  for (let i = 1; i <= tenureMonths; i++) {
    const isLast = i === tenureMonths;
    const principalAmount = isLast ? roundMoney(principal) : 0;
    const closingBalance = isLast ? 0 : roundMoney(principal);

    entries.push({
      installmentNo: i,
      dueDate: addMonths(startDate, i),
      openingBalance: roundMoney(principal),
      interestAmount: monthlyInterest,
      principalAmount,
      totalPayout: roundMoney(monthlyInterest + principalAmount),
      closingBalance,
    });
  }

  return entries;
}

function buildAmortizingSchedule(
  principal: number,
  tenureMonths: number,
  r: number,
  startDate: Date
): ScheduleEntry[] {
  const n = tenureMonths;
  const emi = r === 0 ? principal / n : (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);

  const entries: ScheduleEntry[] = [];
  let balance = principal;

  for (let i = 1; i <= n; i++) {
    const isLast = i === n;
    const interestAmount = roundMoney(balance * r);
    let principalAmount = roundMoney(emi - interestAmount);
    let closingBalance = roundMoney(balance - principalAmount);

    // Final installment absorbs any rounding drift so the balance lands exactly on zero.
    if (isLast) {
      principalAmount = roundMoney(balance);
      closingBalance = 0;
    }

    entries.push({
      installmentNo: i,
      dueDate: addMonths(startDate, i),
      openingBalance: roundMoney(balance),
      interestAmount,
      principalAmount,
      totalPayout: roundMoney(interestAmount + principalAmount),
      closingBalance,
    });

    balance = closingBalance;
  }

  return entries;
}
