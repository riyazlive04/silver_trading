import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getFeatureFlags } from "@/lib/settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InvestmentStatusBadge } from "@/components/investments/investment-status-badge";
import { InvestmentStatusActions } from "@/components/investments/investment-status-actions";
import { ExportButtons } from "@/components/investments/export-buttons";
import { ScheduleTable } from "@/components/investments/schedule-table";
import { formatDate, formatINR } from "@/lib/format";

export default async function InvestmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [investment, flags] = await Promise.all([
    prisma.investment.findUnique({
      where: { id },
      include: { client: true, schedule: { orderBy: { installmentNo: "asc" } } },
    }),
    getFeatureFlags(),
  ]);

  if (!investment) notFound();

  const paidCount = investment.schedule.filter((s) => s.status === "PAID").length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link href={`/clients/${investment.clientId}`} className="hover:underline">
              {investment.client.name}
            </Link>
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">{formatINR(investment.principalAmount)} investment</h1>
        </div>
        <div className="flex items-center gap-2">
          <ExportButtons investmentId={investment.id} />
          <InvestmentStatusActions id={investment.id} status={investment.status} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <SummaryCard label="Principal" value={formatINR(investment.principalAmount)} />
        <SummaryCard label="Tenure" value={`${investment.tenureYears} years`} />
        <SummaryCard
          label="Rate"
          value={`${investment.ratePercentApplied}% ${investment.rateBasisApplied === "MONTHLY" ? "/mo" : "/yr"}`}
        />
        <SummaryCard label="Maturity" value={formatDate(investment.maturityDate)} />
        <SummaryCard label="Status" value={<InvestmentStatusBadge status={investment.status} />} />
      </div>

      {investment.notes && (
        <Card>
          <CardContent className="py-3 text-sm text-muted-foreground">{investment.notes}</CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle className="text-base">Repayment schedule</CardTitle>
          {flags.payoutTrackingEnabled && (
            <p className="text-sm text-muted-foreground">
              {paidCount} / {investment.schedule.length} installments paid
            </p>
          )}
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <ScheduleTable
            schedule={investment.schedule}
            payoutTrackingEnabled={flags.payoutTrackingEnabled}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 px-4 py-3">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="font-semibold">{value}</span>
      </CardContent>
    </Card>
  );
}
