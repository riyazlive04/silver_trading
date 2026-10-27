import { prisma } from "@/lib/prisma";
import { getActiveRatePlans, getInterestSettings } from "@/lib/settings";
import { NewInvestmentForm } from "@/components/investments/new-investment-form";

export default async function NewInvestmentPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  const { clientId } = await searchParams;

  const [clients, ratePlans, settings] = await Promise.all([
    prisma.client.findMany({ select: { id: true, name: true, phone: true }, orderBy: { name: "asc" } }),
    getActiveRatePlans(),
    getInterestSettings(),
  ]);

  return (
    <NewInvestmentForm
      clients={clients}
      ratePlans={ratePlans}
      settings={{
        minimumInvestment: settings.minimumInvestment,
        rateBasis: settings.rateBasis,
        payoutType: settings.payoutType,
      }}
      defaultClientId={clientId}
    />
  );
}
