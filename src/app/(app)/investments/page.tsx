import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InvestmentStatusBadge } from "@/components/investments/investment-status-badge";
import { formatDate, formatINR } from "@/lib/format";
import type { InvestmentStatus } from "@prisma/client";

export default async function InvestmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q, status } = await searchParams;

  const investments = await prisma.investment.findMany({
    where: {
      status: status && status !== "ALL" ? (status as InvestmentStatus) : undefined,
      client: q ? { name: { contains: q } } : undefined,
    },
    include: { client: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Investments</h1>
          <p className="text-sm text-muted-foreground">Every investment on the desk, with its repayment status.</p>
        </div>
        <Button asChild>
          <Link href="/investments/new">
            <Plus className="size-4" />
            New Investment
          </Link>
        </Button>
      </div>

      <form className="flex gap-3">
        <Input name="q" placeholder="Search by client name..." defaultValue={q ?? ""} className="max-w-sm" />
        <Select name="status" defaultValue={status ?? "ALL"}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="CLOSED">Closed</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Button type="submit" variant="secondary">
          <Search className="size-4" />
          Filter
        </Button>
      </form>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Principal</TableHead>
                <TableHead>Tenure</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Maturity</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {investments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    No investments found.
                  </TableCell>
                </TableRow>
              )}
              {investments.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell>
                    <Link href={`/investments/${inv.id}`} className="font-medium hover:underline">
                      {inv.client.name}
                    </Link>
                  </TableCell>
                  <TableCell className="tabular-nums">{formatINR(inv.principalAmount)}</TableCell>
                  <TableCell>{inv.tenureYears}y</TableCell>
                  <TableCell>
                    {inv.ratePercentApplied}% {inv.rateBasisApplied === "MONTHLY" ? "/mo" : "/yr"}
                  </TableCell>
                  <TableCell>{formatDate(inv.maturityDate)}</TableCell>
                  <TableCell>
                    <InvestmentStatusBadge status={inv.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
