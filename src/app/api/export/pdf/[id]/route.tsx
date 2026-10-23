import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-guard";
import { getFeatureFlags } from "@/lib/settings";
import { generateCoverNote } from "@/lib/ai/cover-note";
import { InvestmentStatement } from "@/components/pdf/investment-statement";
import { formatINRAscii } from "@/lib/format";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;

  const investment = await prisma.investment.findUnique({
    where: { id },
    include: { client: true, schedule: { orderBy: { installmentNo: "asc" } } },
  });
  if (!investment) return NextResponse.json({ error: "Investment not found." }, { status: 404 });

  const flags = await getFeatureFlags();
  const totals = investment.schedule.reduce(
    (acc, row) => ({
      totalInterest: acc.totalInterest + row.interestAmount,
      totalPrincipal: acc.totalPrincipal + row.principalAmount,
      totalPayout: acc.totalPayout + row.totalPayout,
    }),
    { totalInterest: 0, totalPrincipal: 0, totalPayout: 0 }
  );

  const { text: coverNote } = await generateCoverNote({
    clientName: investment.client.name,
    principalAmount: investment.principalAmount,
    tenureYears: investment.tenureYears,
    ratePercent: investment.ratePercentApplied,
    rateBasis: investment.rateBasisApplied,
    payoutType: investment.payoutTypeApplied,
    startDate: investment.startDate,
    maturityDate: investment.maturityDate,
    firstPayout: investment.schedule[0]?.totalPayout ?? 0,
    totalPayout: totals.totalPayout,
    formatCurrency: formatINRAscii,
  });

  const buffer = await renderToBuffer(
    <InvestmentStatement
      client={investment.client}
      investment={investment}
      schedule={investment.schedule}
      totals={totals}
      coverNote={coverNote}
      generatedAt={new Date()}
      payoutTrackingEnabled={flags.payoutTrackingEnabled}
    />
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="sirah-digital-statement-${investment.client.name.replace(/\s+/g, "-")}-${investment.id.slice(-6)}.pdf"`,
    },
  });
}
