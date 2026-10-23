import { AlertTriangle, CalendarClock, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatINR } from "@/lib/format";
import Link from "next/link";
import type { getReminders } from "@/lib/dashboard";

type Reminders = Awaited<ReturnType<typeof getReminders>>;

export function RemindersFeed({ reminders }: { reminders: Reminders }) {
  const { dueSoon, maturingSoon, overduePending, payoutTrackingEnabled } = reminders;
  const isEmpty = dueSoon.length === 0 && maturingSoon.length === 0 && overduePending.length === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Automated reminders</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isEmpty && <p className="text-sm text-muted-foreground">Nothing needs attention right now.</p>}

        {payoutTrackingEnabled && overduePending.length > 0 && (
          <ReminderSection
            icon={<AlertTriangle className="size-4 text-[#d03b3b]" />}
            title="Overdue payouts"
            items={overduePending.map((e) => ({
              id: e.id,
              href: `/investments/${e.investmentId}`,
              primary: e.investment.client.name,
              secondary: `Installment #${e.installmentNo} — due ${formatDate(e.dueDate)}`,
              amount: e.totalPayout,
            }))}
            badgeVariant="destructive"
          />
        )}

        <ReminderSection
          icon={<Clock className="size-4 text-muted-foreground" />}
          title="Payouts due in the next 14 days"
          items={dueSoon.map((e) => ({
            id: e.id,
            href: `/investments/${e.investmentId}`,
            primary: e.investment.client.name,
            secondary: `Installment #${e.installmentNo} — due ${formatDate(e.dueDate)}`,
            amount: e.totalPayout,
          }))}
        />

        <ReminderSection
          icon={<CalendarClock className="size-4 text-muted-foreground" />}
          title="Maturing in the next 60 days"
          items={maturingSoon.map((inv) => ({
            id: inv.id,
            href: `/investments/${inv.id}`,
            primary: inv.client.name,
            secondary: `Matures ${formatDate(inv.maturityDate)}`,
            amount: inv.principalAmount,
          }))}
        />
      </CardContent>
    </Card>
  );
}

function ReminderSection({
  icon,
  title,
  items,
  badgeVariant,
}: {
  icon: React.ReactNode;
  title: string;
  items: { id: string; href: string; primary: string; secondary: string; amount: number }[];
  badgeVariant?: "destructive" | "secondary";
}) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        {icon}
        <span>{title}</span>
        <Badge variant={badgeVariant ?? "secondary"} className="ml-auto">
          {items.length}
        </Badge>
      </div>
      <div className="flex flex-col divide-y rounded-lg border">
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="flex items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-muted/50"
          >
            <div className="flex flex-col">
              <span className="font-medium">{item.primary}</span>
              <span className="text-xs text-muted-foreground">{item.secondary}</span>
            </div>
            <span className="shrink-0 font-medium tabular-nums">{formatINR(item.amount)}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
