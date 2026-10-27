import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-guard";
import { getActiveRatePlans, getInterestSettings } from "@/lib/settings";
import { computeSchedule, resolveRate } from "@/lib/calculator";
import { createInvestmentSchema } from "@/lib/validations/investment";
import { buildStatementWorkbook } from "@/lib/export/statement-workbook";
import { InvestmentStatement } from "@/components/pdf/investment-statement";

/**
 * Exports the repayment schedule for an investment that hasn't been created yet.
 * The schedule is recomputed here from the current rate settings (not trusted
 * from the client) so the file matches what "Create investment" will save.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ format: string }> }) {
  await requireSession();
  const { format } = await params;
  if (format !== "pdf" && format !== "excel") {
    return NextResponse.json({ error: "Unknown export format." }, { status: 404 });
  }

  const settings = await getInterestSettings();
  const parsed = createInvestmentSchema(settings.minimumInvestment).safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: z.prettifyError(parsed.error) }, { status: 400 });
  }
  const data = parsed.data;

  const client = await prisma.client.findUnique({ where: { id: data.clientId } });
  if (!client) return NextResponse.json({ error: "Client not found." }, { status: 404 });

  const { ratePercent } = resolveRate(data.tenureYears, await getActiveRatePlans());
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

  const investment = {
    principalAmount: data.principalAmount,
    tenureYears: data.tenureYears,
    ratePercentApplied: ratePercent,
    rateBasisApplied: settings.rateBasis,
    payoutTypeApplied: settings.payoutType,
    startDate,
    maturityDate,
    status: "PROPOSED",
  };
  const fileBase = `sirah-digital-proposal-${client.name.replace(/\s+/g, "-")}`;

  if (format === "excel") {
    const buffer = await buildStatementWorkbook({
      title: "Sirah Digital — Proposed Repayment Schedule",
      client,
      investment,
      schedule: result.entries,
      payoutTrackingEnabled: false,
    });
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileBase}.xlsx"`,
      },
    });
  }

  const buffer = await renderToBuffer(
    <InvestmentStatement
      client={client}
      investment={investment}
      schedule={result.entries.map((e) => ({ ...e, status: "PENDING" as const }))}
      totals={result}
      generatedAt={new Date()}
      payoutTrackingEnabled={false}
    />
  );
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileBase}.pdf"`,
    },
  });
}
