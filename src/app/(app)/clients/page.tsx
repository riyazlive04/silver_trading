import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { ClientDialog } from "@/components/clients/client-dialog";
import { formatINR } from "@/lib/format";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  const clients = await prisma.client.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q } },
            { phone: { contains: q } },
            { email: { contains: q } },
          ],
        }
      : undefined,
    include: {
      _count: { select: { investments: true } },
      investments: { where: { status: "ACTIVE" }, select: { principalAmount: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clients</h1>
          <p className="text-sm text-muted-foreground">Everyone who has invested with the desk.</p>
        </div>
        <ClientDialog />
      </div>

      <form className="flex max-w-md gap-3">
        <Input name="q" placeholder="Search by name, phone, or email..." defaultValue={q ?? ""} />
        <Button type="submit" variant="secondary">
          <Search className="size-4" />
          Search
        </Button>
      </form>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Investments</TableHead>
                <TableHead className="text-right">Active principal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    No clients found.
                  </TableCell>
                </TableRow>
              )}
              {clients.map((client) => {
                const activePrincipal = client.investments.reduce((sum, i) => sum + i.principalAmount, 0);
                return (
                  <TableRow key={client.id}>
                    <TableCell>
                      <Link href={`/clients/${client.id}`} className="font-medium hover:underline">
                        {client.name}
                      </Link>
                    </TableCell>
                    <TableCell>{client.phone}</TableCell>
                    <TableCell className="text-muted-foreground">{client.email || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{client._count.investments}</Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatINR(activePrincipal)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
