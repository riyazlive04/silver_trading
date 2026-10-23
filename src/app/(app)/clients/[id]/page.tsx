import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ClientDialog } from "@/components/clients/client-dialog";
import { formatDate, formatINR } from "@/lib/format";
import { InvestmentStatusBadge } from "@/components/investments/investment-status-badge";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      investments: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!client) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{client.name}</h1>
          <p className="text-sm text-muted-foreground">
            {client.phone}
            {client.email ? ` · ${client.email}` : ""}
          </p>
        </div>
        <ClientDialog client={client} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <Detail label="Address" value={client.address} />
            <Detail label="PAN" value={client.panNumber} />
            <Detail label="Notes" value={client.notes} />
            <Detail label="Client since" value={formatDate(client.createdAt)} />
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="text-base">Investments</CardTitle>
            <Button asChild size="sm">
              <Link href={`/investments/new?clientId=${client.id}`}>
                <Plus className="size-4" />
                New Investment
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Principal</TableHead>
                  <TableHead>Tenure</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Maturity</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {client.investments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                      No investments yet.
                    </TableCell>
                  </TableRow>
                )}
                {client.investments.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>
                      <Link href={`/investments/${inv.id}`} className="font-medium tabular-nums hover:underline">
                        {formatINR(inv.principalAmount)}
                      </Link>
                    </TableCell>
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
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span>{value || "—"}</span>
    </div>
  );
}
