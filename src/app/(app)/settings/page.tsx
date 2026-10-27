import { prisma } from "@/lib/prisma";
import { getFeatureFlags, getInterestSettings, getOpenAIApiKeyMasked } from "@/lib/settings";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { InterestSettingsForm } from "@/components/settings/interest-settings-form";
import { RatePlansEditor } from "@/components/settings/rate-plans-editor";
import { ApiKeyForm } from "@/components/settings/api-key-form";

export default async function SettingsPage() {
  const [settings, ratePlans, flags, maskedApiKey] = await Promise.all([
    getInterestSettings(),
    prisma.ratePlan.findMany({ orderBy: { sortOrder: "asc" } }),
    getFeatureFlags(),
    getOpenAIApiKeyMasked(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Rates & Rules</h1>
        <p className="text-sm text-muted-foreground">
          Controls how every new investment&apos;s repayment schedule is calculated.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Interest Rules</CardTitle>
            <CardDescription>Global rate basis, payout structure, and minimum investment.</CardDescription>
          </CardHeader>
          <CardContent>
            <InterestSettingsForm
              initial={{
                rateBasis: settings.rateBasis,
                payoutType: settings.payoutType,
                minimumInvestment: settings.minimumInvestment,
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tenure Rate Plans</CardTitle>
            <CardDescription>The tenure-linked rate slabs clients choose from.</CardDescription>
          </CardHeader>
          <CardContent>
            <RatePlansEditor
              initial={ratePlans.map((p) => ({
                id: p.id,
                tenureYears: p.tenureYears,
                label: p.label,
                ratePercent: p.ratePercent,
                isActive: p.isActive,
                sortOrder: p.sortOrder,
              }))}
            />
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <ApiKeyForm maskedApiKey={maskedApiKey} hasStoredApiKey={!!flags.openaiApiKeyEncrypted} />
        </div>
      </div>
    </div>
  );
}
