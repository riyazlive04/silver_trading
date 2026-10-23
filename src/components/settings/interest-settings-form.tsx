"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveInterestSettings } from "@/lib/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { PayoutType, RateBasis } from "@/lib/calculator";

export function InterestSettingsForm({
  initial,
}: {
  initial: { rateBasis: RateBasis; payoutType: PayoutType; minimumInvestment: number };
}) {
  const router = useRouter();
  const [rateBasis, setRateBasis] = useState<RateBasis>(initial.rateBasis);
  const [payoutType, setPayoutType] = useState<PayoutType>(initial.payoutType);
  const [minimumInvestment, setMinimumInvestment] = useState(String(initial.minimumInvestment));
  const [submitting, setSubmitting] = useState(false);

  const onSave = async () => {
    setSubmitting(true);
    try {
      await saveInterestSettings({
        rateBasis,
        payoutType,
        minimumInvestment: Number(minimumInvestment),
      });
      toast.success("Interest rules updated.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save settings.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label>Rate basis</Label>
        <Select value={rateBasis} onValueChange={(v) => setRateBasis(v as RateBasis)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="MONTHLY">Monthly — rate applies per month</SelectItem>
            <SelectItem value="ANNUAL">Annual — rate applies per year (paid monthly)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Payout structure</Label>
        <Select value={payoutType} onValueChange={(v) => setPayoutType(v as PayoutType)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="INTEREST_ONLY">Interest-only — principal returned at maturity</SelectItem>
            <SelectItem value="AMORTIZING">Amortizing — EMI-style, principal + interest each month</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="minimumInvestment">Minimum investment (₹)</Label>
        <Input
          id="minimumInvestment"
          type="number"
          step="1000"
          value={minimumInvestment}
          onChange={(e) => setMinimumInvestment(e.target.value)}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        These apply to <strong>new</strong> investments only — existing investments keep the rules that were active
        when they were created.
      </p>

      <Button onClick={onSave} disabled={submitting} className="self-end">
        {submitting ? "Saving..." : "Save changes"}
      </Button>
    </div>
  );
}
