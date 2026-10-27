"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FileSpreadsheet, FileText, TableProperties } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { ComputeScheduleResult } from "@/lib/calculator";
import { formatINR } from "@/lib/format";

export interface PreviewExportInput {
  clientId: string;
  principalAmount: number;
  tenureYears: number;
  startDate: string;
}

export function SchedulePreviewDialog({
  schedule,
  exportInput,
  clientName,
  disabled,
}: {
  schedule: ComputeScheduleResult | null;
  exportInput: PreviewExportInput;
  clientName?: string;
  disabled?: boolean;
}) {
  const [exporting, setExporting] = useState<"pdf" | "excel" | null>(null);

  const download = async (format: "pdf" | "excel") => {
    if (!exportInput.clientId) {
      toast.error("Select a client first.");
      return;
    }
    setExporting(format);
    try {
      const res = await fetch(`/api/export/preview/${format}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(exportInput),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Export failed.");
      }
      const blob = await res.blob();
      const filename =
        res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] ??
        `repayment-schedule.${format === "pdf" ? "pdf" : "xlsx"}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed.");
    } finally {
      setExporting(null);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={disabled || !schedule}>
          <TableProperties className="size-4" />
          View full schedule
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Repayment schedule</DialogTitle>
          <DialogDescription>
            {clientName ? `${clientName} · ` : ""}
            {schedule ? `${schedule.entries.length} installments · Total payout ${formatINR(schedule.totalPayout)}` : ""}
          </DialogDescription>
        </DialogHeader>

        {schedule && (
          <div className="min-h-0 flex-1 overflow-auto rounded-lg border">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-primary text-xs text-primary-foreground">
                <tr>
                  <th className="border-r border-primary-foreground/20 px-3 py-2 text-left">#</th>
                  <th className="border-r border-primary-foreground/20 px-3 py-2 text-left">Due Date</th>
                  <th className="border-r border-primary-foreground/20 px-3 py-2 text-right">Opening Balance</th>
                  <th className="border-r border-primary-foreground/20 px-3 py-2 text-right">Interest</th>
                  <th className="border-r border-primary-foreground/20 px-3 py-2 text-right">Principal</th>
                  <th className="border-r border-primary-foreground/20 px-3 py-2 text-right">Total Payout</th>
                  <th className="px-3 py-2 text-right">Closing Balance</th>
                </tr>
              </thead>
              <tbody>
                {schedule.entries.map((e) => (
                  <tr key={e.installmentNo} className="border-b even:bg-muted/40 [&>td]:border-r [&>td:last-child]:border-r-0">
                    <td className="px-3 py-1.5 tabular-nums text-muted-foreground">{e.installmentNo}</td>
                    <td className="px-3 py-1.5 tabular-nums">{new Date(e.dueDate).toLocaleDateString("en-IN")}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{formatINR(e.openingBalance)}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{formatINR(e.interestAmount)}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{formatINR(e.principalAmount)}</td>
                    <td className="px-3 py-1.5 text-right font-medium tabular-nums">{formatINR(e.totalPayout)}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{formatINR(e.closingBalance)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="sticky bottom-0 bg-muted font-semibold">
                <tr className="[&>td]:border-r [&>td:last-child]:border-r-0">
                  <td className="px-3 py-2" />
                  <td className="px-3 py-2">Total</td>
                  <td className="px-3 py-2" />
                  <td className="px-3 py-2 text-right tabular-nums">{formatINR(schedule.totalInterest)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatINR(schedule.totalPrincipal)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatINR(schedule.totalPayout)}</td>
                  <td className="px-3 py-2" />
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => download("pdf")} disabled={exporting !== null}>
            <FileText className="size-4" />
            {exporting === "pdf" ? "Exporting..." : "Export PDF"}
          </Button>
          <Button onClick={() => download("excel")} disabled={exporting !== null}>
            <FileSpreadsheet className="size-4" />
            {exporting === "excel" ? "Exporting..." : "Export Excel"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
