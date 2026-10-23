import { prisma } from "@/lib/prisma";
import { getFeatureFlags } from "@/lib/settings";

export async function getDashboardStats() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const in90Days = new Date(now);
  in90Days.setDate(in90Days.getDate() + 90);

  const [activeInvestments, aumResult, payoutsThisMonth, maturingSoonCount] = await Promise.all([
    prisma.investment.count({ where: { status: "ACTIVE" } }),
    prisma.investment.aggregate({ where: { status: "ACTIVE" }, _sum: { principalAmount: true } }),
    prisma.repaymentEntry.aggregate({
      where: { dueDate: { gte: monthStart, lt: monthEnd }, investment: { status: "ACTIVE" } },
      _sum: { totalPayout: true },
      _count: true,
    }),
    prisma.investment.count({
      where: { status: "ACTIVE", maturityDate: { gte: now, lte: in90Days } },
    }),
  ]);

  return {
    activeInvestments,
    totalAUM: aumResult._sum.principalAmount ?? 0,
    payoutsThisMonthAmount: payoutsThisMonth._sum.totalPayout ?? 0,
    payoutsThisMonthCount: payoutsThisMonth._count,
    maturingSoonCount,
  };
}

export async function getUpcomingPayoutsByMonth(months = 6) {
  const now = new Date();
  const rangeEnd = new Date(now.getFullYear(), now.getMonth() + months, 1);

  const entries = await prisma.repaymentEntry.findMany({
    where: { dueDate: { gte: now, lt: rangeEnd }, investment: { status: "ACTIVE" } },
    select: { dueDate: true, totalPayout: true },
  });

  const buckets: { key: string; label: string; amount: number }[] = [];
  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    buckets.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" }),
      amount: 0,
    });
  }

  const byKey = new Map(buckets.map((b) => [b.key, b]));
  for (const entry of entries) {
    const d = new Date(entry.dueDate);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const bucket = byKey.get(key);
    if (bucket) bucket.amount += entry.totalPayout;
  }

  return buckets;
}

const TENURE_BUCKETS = [3, 5, 7, 10] as const;

export async function getPortfolioByTenure() {
  const investments = await prisma.investment.findMany({
    where: { status: "ACTIVE" },
    select: { tenureYears: true, principalAmount: true },
  });

  const totals = new Map<string, number>();
  for (const bucket of TENURE_BUCKETS) totals.set(`${bucket}y`, 0);
  totals.set("10y+", 0);

  for (const inv of investments) {
    const label = TENURE_BUCKETS.includes(inv.tenureYears as (typeof TENURE_BUCKETS)[number])
      ? `${inv.tenureYears}y`
      : "10y+";
    totals.set(label, (totals.get(label) ?? 0) + inv.principalAmount);
  }

  return Array.from(totals.entries())
    .map(([label, amount]) => ({ label, amount }))
    .filter((row) => row.amount > 0);
}

export async function getReminders() {
  const flags = await getFeatureFlags();
  const now = new Date();
  const in14Days = new Date(now);
  in14Days.setDate(in14Days.getDate() + 14);
  const in60Days = new Date(now);
  in60Days.setDate(in60Days.getDate() + 60);

  const [dueSoon, maturingSoon, overduePending] = await Promise.all([
    prisma.repaymentEntry.findMany({
      where: {
        dueDate: { gte: now, lte: in14Days },
        status: "PENDING",
        investment: { status: "ACTIVE" },
      },
      include: { investment: { include: { client: true } } },
      orderBy: { dueDate: "asc" },
      take: 10,
    }),
    prisma.investment.findMany({
      where: { status: "ACTIVE", maturityDate: { gte: now, lte: in60Days } },
      include: { client: true },
      orderBy: { maturityDate: "asc" },
      take: 10,
    }),
    flags.payoutTrackingEnabled
      ? prisma.repaymentEntry.findMany({
          where: { dueDate: { lt: now }, status: "PENDING", investment: { status: "ACTIVE" } },
          include: { investment: { include: { client: true } } },
          orderBy: { dueDate: "asc" },
          take: 10,
        })
      : Promise.resolve([]),
  ]);

  return { dueSoon, maturingSoon, overduePending, payoutTrackingEnabled: flags.payoutTrackingEnabled };
}
