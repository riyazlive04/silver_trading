import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getFeatureFlags } from "@/lib/settings";
import { FeatureFlagsForm } from "@/components/settings/feature-flags-form";

export default async function PlatformSettingsPage() {
  const session = await auth();
  if (session?.user.role !== "SUPER_ADMIN") redirect("/dashboard");

  const flags = await getFeatureFlags();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Platform</h1>
        <p className="text-sm text-muted-foreground">
          Super admin only. Controls which feature sets are switched on for everyone on the desk.
        </p>
      </div>
      <div className="max-w-xl">
        <FeatureFlagsForm
          initial={{ aiSuiteEnabled: flags.aiSuiteEnabled, payoutTrackingEnabled: flags.payoutTrackingEnabled }}
        />
      </div>
    </div>
  );
}
