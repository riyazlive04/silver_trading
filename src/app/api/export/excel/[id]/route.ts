import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-guard";
import { getFeatureFlags } from "@/lib/settings";
import { buildStatementWorkbook } from "@/lib/export/statement-workbook";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;

  const investment = await prisma.investment.findUnique({
    where: { id },
    include: { client: true, schedule: { orderBy: { installmentNo: "asc" } } },
  });
  if (!investment) return NextResponse.json({ error: "Investment not found." }, { status: 404 });

  const flags = await getFeatureFlags();

  const buffer = await buildStatementWorkbook({
    title: "Sirah Digital — Investment & Repayment Statement",
    client: investment.client,
    investment,
    schedule: investment.schedule,
    payoutTrackingEnabled: flags.payoutTrackingEnabled,
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="sirah-digital-statement-${investment.client.name.replace(/\s+/g, "-")}-${investment.id.slice(-6)}.xlsx"`,
    },
  });
}
