"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-guard";
import { createInvestmentSchema, type InvestmentInput } from "@/lib/validations/investment";
import { computeSchedule, resolveRate } from "@/lib/calculator";
import { getActiveRatePlans, getInterestSettings, getFeatureFlags } from "@/lib/settings";
import { logAudit } from "@/lib/audit";

export async function createInvestment(input: InvestmentInput) {
  const session = await requireSession();
  const settings = await getInterestSettings();
  const schema = createInvestmentSchema(settings.minimumInvestment);
  const data = schema.parse(input);

  const ratePlans = await getActiveRatePlans();
  const { ratePercent } = resolveRate(data.tenureYears, ratePlans);

  const tenureMonths = data.tenureYears * 12;
  const startDate = new Date(data.startDate);
  const maturityDate = new Date(startDate);
  maturityDate.setMonth(maturityDate.getMonth() + tenureMonths);

  const result = computeSchedule({
    principal: data.principalAmount,
    tenureMonths,
    ratePercent,
    rateBasis: settings.rateBasis,
    payoutType: settings.payoutType,
    startDate,
  });

  const investment = await prisma.investment.create({
    data: {
      clientId: data.clientId,
      principalAmount: data.principalAmount,
      tenureYears: data.tenureYears,
      tenureMonths,
      startDate,
      maturityDate,
      ratePercentApplied: ratePercent,
      rateBasisApplied: settings.rateBasis,
      payoutTypeApplied: settings.payoutType,
      notes: data.notes || null,
      createdById: session.user.id,
      schedule: {
        create: result.entries.map((e) => ({
          installmentNo: e.installmentNo,
          dueDate: e.dueDate,
          openingBalance: e.openingBalance,
          interestAmount: e.interestAmount,
          principalAmount: e.principalAmount,
          totalPayout: e.totalPayout,
          closingBalance: e.closingBalance,
        })),
      },
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "CREATE_INVESTMENT",
    entityType: "Investment",
    entityId: investment.id,
    after: investment,
  });

  revalidatePath("/investments");
  revalidatePath("/dashboard");
  return investment;
}

export async function updateInvestmentStatus(id: string, status: "ACTIVE" | "CLOSED" | "CANCELLED") {
  const session = await requireSession();
  const before = await prisma.investment.findUniqueOrThrow({ where: { id } });
  const after = await prisma.investment.update({ where: { id }, data: { status } });

  await logAudit({
    userId: session.user.id,
    action: "UPDATE_INVESTMENT_STATUS",
    entityType: "Investment",
    entityId: id,
    before: { status: before.status },
    after: { status: after.status },
  });

  revalidatePath(`/investments/${id}`);
  revalidatePath("/investments");
  revalidatePath("/dashboard");
  return after;
}

async function assertPayoutTrackingEnabled() {
  const flags = await getFeatureFlags();
  if (!flags.payoutTrackingEnabled) {
    throw new Error("Payout tracking is currently disabled by a super admin.");
  }
}

export async function markInstallmentPaid(installmentId: string, paidAmount: number, paidDate?: string) {
  const session = await requireSession();
  await assertPayoutTrackingEnabled();

  const before = await prisma.repaymentEntry.findUniqueOrThrow({ where: { id: installmentId } });
  const after = await prisma.repaymentEntry.update({
    where: { id: installmentId },
    data: {
      status: "PAID",
      paidAmount,
      paidDate: paidDate ? new Date(paidDate) : new Date(),
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "MARK_INSTALLMENT_PAID",
    entityType: "RepaymentEntry",
    entityId: installmentId,
    before,
    after,
  });

  revalidatePath(`/investments/${before.investmentId}`);
  revalidatePath("/dashboard");
  return after;
}

export async function markInstallmentPending(installmentId: string) {
  const session = await requireSession();
  await assertPayoutTrackingEnabled();

  const before = await prisma.repaymentEntry.findUniqueOrThrow({ where: { id: installmentId } });
  const after = await prisma.repaymentEntry.update({
    where: { id: installmentId },
    data: { status: "PENDING", paidAmount: null, paidDate: null },
  });

  await logAudit({
    userId: session.user.id,
    action: "MARK_INSTALLMENT_PENDING",
    entityType: "RepaymentEntry",
    entityId: installmentId,
    before,
    after,
  });

  revalidatePath(`/investments/${before.investmentId}`);
  revalidatePath("/dashboard");
  return after;
}
