import ExcelJS from "exceljs";

const NAVY = "FF1F2D4D";
const GOLD = "FFC9A24B";
const CURRENCY_FMT = '"₹"#,##0';

export interface StatementWorkbookInput {
  title: string;
  client: { name: string; phone: string; email?: string | null };
  investment: {
    principalAmount: number;
    tenureYears: number;
    ratePercentApplied: number;
    rateBasisApplied: "MONTHLY" | "ANNUAL";
    payoutTypeApplied: "INTEREST_ONLY" | "AMORTIZING";
    startDate: Date;
    maturityDate: Date;
    status: string;
  };
  schedule: {
    installmentNo: number;
    dueDate: Date;
    openingBalance: number;
    interestAmount: number;
    principalAmount: number;
    totalPayout: number;
    closingBalance: number;
    status?: string;
  }[];
  payoutTrackingEnabled: boolean;
}

/** Shared by the saved-investment export and the unsaved New Investment preview export. */
export async function buildStatementWorkbook({
  title,
  client,
  investment,
  schedule,
  payoutTrackingEnabled,
}: StatementWorkbookInput): Promise<ExcelJS.Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Sirah Digital";
  workbook.created = new Date();

  // --- Summary sheet ---
  const summary = workbook.addWorksheet("Summary");
  summary.columns = [{ width: 24 }, { width: 36 }];

  summary.mergeCells("A1:B1");
  const titleCell = summary.getCell("A1");
  titleCell.value = title;
  titleCell.font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
  titleCell.alignment = { vertical: "middle" };
  summary.getRow(1).height = 26;

  const summaryRows: [string, string | number][] = [
    ["Client", client.name],
    ["Phone", client.phone],
    ["Email", client.email ?? "—"],
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
  sheet.columns = [
    { header: "#", key: "installmentNo", width: 6 },
    { header: "Due Date", key: "dueDate", width: 14 },
    { header: "Opening Balance", key: "openingBalance", width: 18 },
    { header: "Interest", key: "interestAmount", width: 14 },
    { header: "Principal", key: "principalAmount", width: 14 },
    { header: "Total Payout", key: "totalPayout", width: 14 },
    { header: "Closing Balance", key: "closingBalance", width: 18 },
    ...(payoutTrackingEnabled ? [{ header: "Status", key: "status", width: 12 }] : []),
  ];

  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
    cell.alignment = { horizontal: "center" };
  });

  for (const entry of schedule) {
    sheet.addRow({
      installmentNo: entry.installmentNo,
      dueDate: entry.dueDate.toLocaleDateString("en-IN"),
      openingBalance: entry.openingBalance,
      interestAmount: entry.interestAmount,
      principalAmount: entry.principalAmount,
      totalPayout: entry.totalPayout,
      closingBalance: entry.closingBalance,
      ...(payoutTrackingEnabled ? { status: entry.status } : {}),
    });
  }

  ["openingBalance", "interestAmount", "principalAmount", "totalPayout", "closingBalance"].forEach((key) => {
    sheet.getColumn(key).numFmt = CURRENCY_FMT;
  });

  const totalsRowIndex = schedule.length + 2;
  const totalsRow = sheet.getRow(totalsRowIndex);
  totalsRow.getCell(2).value = "Total";
  totalsRow.getCell(2).font = { bold: true };
  totalsRow.getCell(4).value = { formula: `SUM(D2:D${totalsRowIndex - 1})` } as ExcelJS.CellFormulaValue;
  totalsRow.getCell(5).value = { formula: `SUM(E2:E${totalsRowIndex - 1})` } as ExcelJS.CellFormulaValue;
  totalsRow.getCell(6).value = { formula: `SUM(F2:F${totalsRowIndex - 1})` } as ExcelJS.CellFormulaValue;
  [4, 5, 6].forEach((c) => {
    totalsRow.getCell(c).font = { bold: true };
    totalsRow.getCell(c).numFmt = CURRENCY_FMT;
    totalsRow.getCell(c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: GOLD } };
  });

  return workbook.xlsx.writeBuffer();
}
