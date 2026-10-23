import { Landmark, Wallet, CalendarClock, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatTile } from "@/components/dashboard/stat-tile";
import { UpcomingPayoutsChart } from "@/components/dashboard/upcoming-payouts-chart";
import { PortfolioByTenureChart } from "@/components/dashboard/portfolio-by-tenure-chart";
import { RemindersFeed } from "@/components/dashboard/reminders-feed";
import {
  getDashboardStats,
  getPortfolioByTenure,
  getReminders,
  getUpcomingPayoutsByMonth,
} from "@/lib/dashboard";
import { formatINR } from "@/lib/format";

export default async function DashboardPage() {
  const [stats, upcomingPayouts, portfolioByTenure, reminders] = await Promise.all([
    getDashboardStats(),
    getUpcomingPayoutsByMonth(6),
    getPortfolioByTenure(),
    getReminders(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Portfolio overview for the commodity trading desk.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Active investments" value={stats.activeInvestments.toLocaleString("en-IN")} icon={Landmark} />
        <StatTile label="Total AUM" value={formatINR(stats.totalAUM)} icon={Wallet} accent="gold" />
        <StatTile
          label="Payouts due this month"
          value={`${formatINR(stats.payoutsThisMonthAmount)} (${stats.payoutsThisMonthCount})`}
          icon={TrendingUp}
        />
        <StatTile label="Maturing in 90 days" value={stats.maturingSoonCount.toLocaleString("en-IN")} icon={CalendarClock} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Projected payouts — next 6 months</CardTitle>
          </CardHeader>
          <CardContent>
            <UpcomingPayoutsChart data={upcomingPayouts} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Portfolio by tenure plan</CardTitle>
          </CardHeader>
          <CardContent>
            {portfolioByTenure.length > 0 ? (
              <PortfolioByTenureChart data={portfolioByTenure} />
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">No active investments yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <RemindersFeed reminders={reminders} />
    </div>
  );
}
