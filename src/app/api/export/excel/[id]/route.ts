import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-guard";
import { getFeatureFlags } from "@/lib/settings";

const NAVY = "FF1F2D4D";
const GOLD = "FFC9A24B";
const CURRENCY_FMT = '"₹"#,##0';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;

  const investment = await prisma.investment.findUnique({
    where: { id },
    include: { client: true, schedule: { orderBy: { installmentNo: "asc" } } },
  });
  if (!investment) return NextResponse.json({ error: "Investment not found." }, { status: 404 });

  const flags = await getFeatureFlags();

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Sirah Digital";
  workbook.created = new Date();

  // --- Summary sheet ---
  const summary = workbook.addWorksheet("Summary");
  summary.columns = [{ width: 24 }, { width: 36 }];

  summary.mergeCells("A1:B1");
  const title = summary.getCell("A1");
  title.value = "Sirah Digital — Investment & Repayment Statement";
  title.font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
  title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
  title.alignment = { vertical: "middle" };
  summary.getRow(1).height = 26;

  const summaryRows: [string, string | number][] = [
    ["Client", investment.client.name],
    ["Phone", investment.client.phone],
    ["Email", investment.client.email ?? "—"],
    ["Principal Amount", investment.principalAmount],
    ["Tenure (years)", investment.tenureYears],
    ["Rate", `${investment.ratePercentApplied}% ${investment.rateBasisApplied === "MONTHLY" ? "per month" : "per annum"}`],
    ["Payout Structure", investment.payoutTypeApplied === "INTEREST_ONLY" ? "Interest-only" : "Amortizing (EMI)"],
    ["Start Date", investment.startDate.toLocaleDateString("en-IN")],
    ["Maturity Date", investment.maturityDate.toLocaleDateString("en-IN")],
    ["Status", investment.status],
  ];

  summaryRows.forEach(([label, value], i) => {
    const row = summary.getRow(i + 3);
    row.getCell(1).value = label;
    row.getCell(1).font = { bold: true, color: { argb: "FF52514E" } };
    row.getCell(2).value = value;
    if (label === "Principal Amount") row.getCell(2).numFmt = CURRENCY_FMT;
  });

  // --- Schedule sheet ---
  const sheet = workbook.addWorksheet("Repayment Schedule");
  const columns = [
    { header: "#", key: "installmentNo", width: 6 },
    { header: "Due Date", key: "dueDate", width: 14 },
    { header: "Opening Balance", key: "openingBalance", width: 18 },
    { header: "Interest", key: "interestAmount", width: 14 },
    { header: "Principal", key: "principalAmount", width: 14 },
    { header: "Total Payout", key: "totalPayout", width: 14 },
    { header: "Closing Balance", key: "closingBalance", width: 18 },
    ...(flags.payoutTrackingEnabled ? [{ header: "Status", key: "status", width: 12 }] : []),
  ];
  sheet.columns = columns;

  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
    cell.alignment = { horizontal: "center" };
  });

  for (const entry of investment.schedule) {
    sheet.addRow({
      installmentNo: entry.installmentNo,
      dueDate: entry.dueDate.toLocaleDateString("en-IN"),
      openingBalance: entry.openingBalance,
      interestAmount: entry.interestAmount,
      principalAmount: entry.principalAmount,
      totalPayout: entry.totalPayout,
      closingBalance: entry.closingBalance,
      ...(flags.payoutTrackingEnabled ? { status: entry.status } : {}),
    });
  }

  ["openingBalance", "interestAmount", "principalAmount", "totalPayout", "closingBalance"].forEach((key) => {
    const col = sheet.getColumn(key);
    col.numFmt = CURRENCY_FMT;
  });

  const totalsRowIndex = investment.schedule.length + 2;
  const totalsRow = sheet.getRow(totalsRowIndex);
  totalsRow.getCell(2).value = "Total";
  totalsRow.getCell(2).font = { bold: true };
  totalsRow.getCell(4).value = {
    formula: `SUM(D2:D${totalsRowIndex - 1})`,
  } as ExcelJS.CellFormulaValue;
  totalsRow.getCell(5).value = { formula: `SUM(E2:E${totalsRowIndex - 1})` } as ExcelJS.CellFormulaValue;
  totalsRow.getCell(6).value = { formula: `SUM(F2:F${totalsRowIndex - 1})` } as ExcelJS.CellFormulaValue;
  [4, 5, 6].forEach((c) => {
    totalsRow.getCell(c).font = { bold: true };
    totalsRow.getCell(c).numFmt = CURRENCY_FMT;
    totalsRow.getCell(c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: GOLD } };
  });

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="sirah-digital-statement-${investment.client.name.replace(/\s+/g, "-")}-${investment.id.slice(-6)}.xlsx"`,
    },
  });
}
