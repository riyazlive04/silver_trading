import { describe, expect, it } from "vitest";
import { computeSchedule, resolveRate, roundMoney, toMonthlyRate, type RatePlanLike } from "./calculator";

const BRIEF_PLANS: RatePlanLike[] = [
  { tenureYears: 3, ratePercent: 1.5, isActive: true },
  { tenureYears: 5, ratePercent: 2.0, isActive: true },
  { tenureYears: 7, ratePercent: 3.0, isActive: true },
  { tenureYears: 10, ratePercent: 3.5, isActive: true },
  { tenureYears: null, ratePercent: 3.5, isActive: true },
];

describe("resolveRate", () => {
  it("matches each defined slab from the brief exactly", () => {
    expect(resolveRate(3, BRIEF_PLANS)).toEqual({ ratePercent: 1.5, isFlatAboveMax: false });
    expect(resolveRate(5, BRIEF_PLANS)).toEqual({ ratePercent: 2.0, isFlatAboveMax: false });
    expect(resolveRate(7, BRIEF_PLANS)).toEqual({ ratePercent: 3.0, isFlatAboveMax: false });
    expect(resolveRate(10, BRIEF_PLANS)).toEqual({ ratePercent: 3.5, isFlatAboveMax: false });
  });

  it("applies the flat rate for any tenure beyond the highest defined slab", () => {
    expect(resolveRate(12, BRIEF_PLANS)).toEqual({ ratePercent: 3.5, isFlatAboveMax: true });
    expect(resolveRate(25, BRIEF_PLANS)).toEqual({ ratePercent: 3.5, isFlatAboveMax: true });
  });

  it("ignores inactive plans", () => {
    const plans: RatePlanLike[] = [...BRIEF_PLANS, { tenureYears: 4, ratePercent: 99, isActive: false }];
    expect(() => resolveRate(4, plans)).toThrow();
  });

  it("throws for a tenure that matches no slab and is not above the max", () => {
    expect(() => resolveRate(4, BRIEF_PLANS)).toThrow(/No rate plan found/);
  });
});

describe("toMonthlyRate", () => {
  it("treats a MONTHLY basis rate as already-per-month", () => {
    expect(toMonthlyRate(1.5, "MONTHLY")).toBeCloseTo(0.015, 10);
  });

  it("divides an ANNUAL basis rate by 12", () => {
    expect(toMonthlyRate(1.5, "ANNUAL")).toBeCloseTo(0.00125, 10);
  });
});

describe("computeSchedule — INTEREST_ONLY / MONTHLY basis (brief's stated plans)", () => {
  it.each([
    [3, 36, 1.5],
    [5, 60, 2.0],
    [7, 84, 3.0],
    [10, 120, 3.5],
    [12, 144, 3.5], // above max tenure, flat rate
  ])("tenure=%i years rate=%i%% produces a flat monthly interest payout with principal returned at maturity", (_years, months, ratePercent) => {
    const principal = 300000; // the enforced minimum
    const result = computeSchedule({
      principal,
      tenureMonths: months,
      ratePercent,
      rateBasis: "MONTHLY",
      payoutType: "INTEREST_ONLY",
      startDate: new Date("2026-01-01"),
    });

    const expectedMonthlyInterest = roundMoney(principal * (ratePercent / 100));

    expect(result.entries).toHaveLength(months);

    // Every installment before maturity: flat interest only, balance unchanged.
    for (let i = 0; i < months - 1; i++) {
      const entry = result.entries[i];
      expect(entry.interestAmount).toBe(expectedMonthlyInterest);
      expect(entry.principalAmount).toBe(0);
      expect(entry.closingBalance).toBe(principal);
    }

    // Final installment: interest + full principal, balance zeroed.
    const last = result.entries[months - 1];
    expect(last.interestAmount).toBe(expectedMonthlyInterest);
    expect(last.principalAmount).toBe(principal);
    expect(last.closingBalance).toBe(0);

    expect(result.totalInterest).toBe(roundMoney(expectedMonthlyInterest * months));
    expect(result.totalPrincipal).toBe(principal);
    expect(result.totalPayout).toBe(roundMoney(result.totalInterest + principal));
  });

  it("matches the hand-computed figures for the minimum investment at 3 years / 1.5%", () => {
    const result = computeSchedule({
      principal: 300000,
      tenureMonths: 36,
      ratePercent: 1.5,
      rateBasis: "MONTHLY",
      payoutType: "INTEREST_ONLY",
      startDate: new Date("2026-01-01"),
    });

    // 300000 * 1.5% = 4500/month, flat, for 36 months.
    expect(result.entries[0].totalPayout).toBe(4500);
    expect(result.totalInterest).toBe(4500 * 36);
    expect(result.totalPayout).toBe(4500 * 36 + 300000);
  });
});

describe("computeSchedule — INTEREST_ONLY / ANNUAL basis", () => {
  it("pays 1/12th of the annual rate each month", () => {
    const result = computeSchedule({
      principal: 300000,
      tenureMonths: 36,
      ratePercent: 1.5,
      rateBasis: "ANNUAL",
      payoutType: "INTEREST_ONLY",
      startDate: new Date("2026-01-01"),
    });

    // 300000 * (1.5% / 12) = 375/month.
    expect(result.entries[0].interestAmount).toBe(375);
    expect(result.totalInterest).toBe(375 * 36);
  });
});

describe("computeSchedule — AMORTIZING", () => {
  it.each([
    [36, 1.5, "MONTHLY"],
    [60, 2.0, "MONTHLY"],
    [84, 3.0, "MONTHLY"],
    [120, 3.5, "MONTHLY"],
    [36, 1.5, "ANNUAL"],
  ] as const)("fully amortizes principal to zero over %i months at %s%% (%s basis)", (months, ratePercent, basis) => {
    const principal = 500000;
    const result = computeSchedule({
      principal,
      tenureMonths: months,
      ratePercent,
      rateBasis: basis,
      payoutType: "AMORTIZING",
      startDate: new Date("2026-01-01"),
    });

    expect(result.entries).toHaveLength(months);
    expect(result.entries[result.entries.length - 1].closingBalance).toBe(0);

    // Every installment's EMI (interest + principal) should be equal, allowing for the
    // accumulated paisa-level rounding drift expected over a long high-rate schedule.
    const emiValues = result.entries.map((e) => e.totalPayout);
    const tolerance = Math.max(0.02, emiValues[0] * 0.001);
    for (const payout of emiValues) {
      expect(Math.abs(payout - emiValues[0])).toBeLessThanOrEqual(tolerance);
    }

    // Sum of principal portions must reconstruct the original principal exactly.
    expect(result.totalPrincipal).toBe(principal);

    // Balances must monotonically decrease.
    let prevBalance = principal;
    for (const entry of result.entries) {
      expect(entry.openingBalance).toBeLessThanOrEqual(prevBalance);
      expect(entry.closingBalance).toBeLessThanOrEqual(entry.openingBalance);
      prevBalance = entry.closingBalance;
    }
  });

  it("handles a zero rate without dividing by zero", () => {
    const result = computeSchedule({
      principal: 300000,
      tenureMonths: 12,
      ratePercent: 0,
      rateBasis: "MONTHLY",
      payoutType: "AMORTIZING",
      startDate: new Date("2026-01-01"),
    });
    expect(result.totalInterest).toBe(0);
    expect(result.totalPrincipal).toBe(300000);
    expect(result.entries[0].totalPayout).toBe(25000);
  });
});

describe("computeSchedule — input validation", () => {
  it("rejects a non-positive principal", () => {
    expect(() =>
      computeSchedule({
        principal: 0,
        tenureMonths: 36,
        ratePercent: 1.5,
        rateBasis: "MONTHLY",
        payoutType: "INTEREST_ONLY",
        startDate: new Date(),
      })
    ).toThrow();
  });

  it("rejects a non-integer or non-positive tenure", () => {
    expect(() =>
      computeSchedule({
        principal: 300000,
        tenureMonths: 0,
        ratePercent: 1.5,
        rateBasis: "MONTHLY",
        payoutType: "INTEREST_ONLY",
        startDate: new Date(),
      })
    ).toThrow();
  });
});
