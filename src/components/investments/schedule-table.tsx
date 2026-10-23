"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Circle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { markInstallmentPaid, markInstallmentPending } from "@/lib/actions/investments";
import { formatDate, formatINR } from "@/lib/format";

export interface ScheduleRow {
  id: string;
  installmentNo: number;
  dueDate: Date | string;
  interestAmount: number;
  principalAmount: number;
  totalPayout: number;
  closingBalance: number;
  status: "PENDING" | "PAID";
  paidDate: Date | string | null;
}

export function ScheduleTable({
  schedule,
  payoutTrackingEnabled,
}: {
  schedule: ScheduleRow[];
  payoutTrackingEnabled: boolean;
}) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const toggle = (row: ScheduleRow) => {
    setPendingId(row.id);
    startTransition(async () => {
      try {
        if (row.status === "PENDING") {
          await markInstallmentPaid(row.id, row.totalPayout);
          toast.success(`Installment #${row.installmentNo} marked paid.`);
        } else {
          await markInstallmentPending(row.id);
          toast.success(`Installment #${row.installmentNo} marked pending.`);
        }
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not update installment.");
      } finally {
        setPendingId(null);
      }
    });
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>#</TableHead>
          <TableHead>Due date</TableHead>
          <TableHead className="text-right">Interest</TableHead>
          <TableHead className="text-right">Principal</TableHead>
          <TableHead className="text-right">Payout</TableHead>
          <TableHead className="text-right">Balance</TableHead>
          <TableHead>Status</TableHead>
          {payoutTrackingEnabled && <TableHead className="text-right">Action</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {schedule.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="tabular-nums">{row.installmentNo}</TableCell>
            <TableCell>{formatDate(row.dueDate)}</TableCell>
            <TableCell className="text-right tabular-nums">{formatINR(row.interestAmount)}</TableCell>
            <TableCell className="text-right tabular-nums">{formatINR(row.principalAmount)}</TableCell>
            <TableCell className="text-right font-medium tabular-nums">{formatINR(row.totalPayout)}</TableCell>
            <TableCell className="text-right tabular-nums text-muted-foreground">
              {formatINR(row.closingBalance)}
            </TableCell>
            <TableCell>
              {row.status === "PAID" ? (
                <Badge className="gap-1 bg-[#0ca30c] text-white">
                  <CheckCircle2 className="size-3" /> Paid
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1">
                  <Circle className="size-3" /> Pending
                </Badge>
              )}
            </TableCell>
            {payoutTrackingEnabled && (
              <TableCell className="text-right">
                <Button
                  size="sm"
                  variant={row.status === "PENDING" ? "default" : "outline"}
                  disabled={isPending && pendingId === row.id}
                  onClick={() => toggle(row)}
                >
                  {row.status === "PENDING" ? "Mark Paid" : "Mark Pending"}
                </Button>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
