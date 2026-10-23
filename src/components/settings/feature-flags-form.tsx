"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkles, Wallet } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { saveFeatureFlags } from "@/lib/actions/settings";

export function FeatureFlagsForm({
  initial,
}: {
  initial: { aiSuiteEnabled: boolean; payoutTrackingEnabled: boolean };
}) {
  const router = useRouter();
  const [aiSuiteEnabled, setAiSuiteEnabled] = useState(initial.aiSuiteEnabled);
  const [payoutTrackingEnabled, setPayoutTrackingEnabled] = useState(initial.payoutTrackingEnabled);
  const [submitting, setSubmitting] = useState(false);

  const dirty = aiSuiteEnabled !== initial.aiSuiteEnabled || payoutTrackingEnabled !== initial.payoutTrackingEnabled;

  const onSave = async () => {
    setSubmitting(true);
    try {
      await saveFeatureFlags({ aiSuiteEnabled, payoutTrackingEnabled });
      toast.success("Platform settings updated.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save platform settings.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex items-start justify-between gap-4 py-4">
          <div className="flex gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-gold/15 text-brand-gold-foreground">
              <Sparkles className="size-4" />
            </div>
            <div>
              <p className="font-medium">Full AI Suite</p>
              <p className="text-sm text-muted-foreground">
                AI-generated cover notes on exported PDFs, and the natural-language portfolio assistant. The
                rule-based reminders on the dashboard always stay on regardless of this toggle.
              </p>
            </div>
          </div>
          <Switch checked={aiSuiteEnabled} onCheckedChange={setAiSuiteEnabled} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-start justify-between gap-4 py-4">
          <div className="flex gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Wallet className="size-4" />
            </div>
            <div>
              <p className="font-medium">Track Actual Payouts</p>
              <p className="text-sm text-muted-foreground">
                Lets staff mark installments Paid/Pending. When off, the app behaves as a pure calculator/quote
                generator — schedules still export, but nothing is tracked.
              </p>
            </div>
          </div>
          <Switch checked={payoutTrackingEnabled} onCheckedChange={setPayoutTrackingEnabled} />
        </CardContent>
      </Card>

      <Button onClick={onSave} disabled={submitting || !dirty} className="self-end">
        {submitting ? "Saving..." : "Save changes"}
      </Button>
    </div>
  );
}
