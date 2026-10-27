"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ClientCombobox, type ClientOption } from "@/components/investments/client-combobox";
import { SchedulePreviewDialog } from "@/components/investments/schedule-preview-dialog";
import { createInvestment } from "@/lib/actions/investments";
import { computeSchedule, resolveRate, type PayoutType, type RateBasis } from "@/lib/calculator";
import { formatINR } from "@/lib/format";

interface RatePlanOption {
  tenureYears: number | null;
  label: string;
  ratePercent: number;
  isActive: boolean;
}

interface Settings {
  minimumInvestment: number;
  rateBasis: RateBasis;
  payoutType: PayoutType;
}

export function NewInvestmentForm({
  clients,
  ratePlans,
  settings,
  defaultClientId,
}: {
  clients: ClientOption[];
  ratePlans: RatePlanOption[];
  settings: Settings;
  defaultClientId?: string;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const definedPlans = ratePlans.filter((p) => p.tenureYears !== null);
  const flatPlan = ratePlans.find((p) => p.tenureYears === null);
  const maxDefinedTenure = definedPlans.reduce((max, p) => Math.max(max, p.tenureYears as number), 0);

  const {
    control,
    register,
    handleSubmit,
    watch,
  } = useForm({
    defaultValues: {
      clientId: defaultClientId ?? "",
      principalAmount: "" as string,
      tenureSelection: definedPlans[0] ? String(definedPlans[0].tenureYears) : "custom",
      customTenureYears: "" as string,
      startDate: new Date().toISOString().slice(0, 10),
      notes: "",
    },
  });

  const clientId = watch("clientId");
  const principalAmount = watch("principalAmount");
  const tenureSelection = watch("tenureSelection");
  const customTenureYears = watch("customTenureYears");
  const startDate = watch("startDate");

  const tenureYears =
    tenureSelection === "custom" ? Number(customTenureYears) : Number(tenureSelection);
  const principal = Number(principalAmount);

  const preview = useMemo(() => {
    if (!principal || principal <= 0 || !tenureYears || tenureYears <= 0 || !startDate) return null;
    try {
      const { ratePercent } = resolveRate(tenureYears, ratePlans.map((p) => ({ ...p, isActive: true })));
      const result = computeSchedule({
        principal,
        tenureMonths: tenureYears * 12,
        ratePercent,
        rateBasis: settings.rateBasis,
        payoutType: settings.payoutType,
        startDate: new Date(startDate),
      });
      return { ratePercent, ...result };
    } catch {
      return null;
    }
  }, [principal, tenureYears, startDate, ratePlans, settings]);

  const belowMinimum = principal > 0 && principal < settings.minimumInvestment;

  const onSubmit = async () => {
    if (!clientId) {
      toast.error("Select a client first.");
      return;
    }
    setSubmitting(true);
    try {
      const investment = await createInvestment({
        clientId,
        principalAmount: principal,
        tenureYears,
        startDate,
        notes: watch("notes") || undefined,
      });
      toast.success("Investment created.");
      router.push(`/investments/${investment.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create the investment.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">New Investment</h1>
          <p className="text-sm text-muted-foreground">
            Enter the amount and tenure — the repayment schedule is calculated automatically.
          </p>
        </div>
        <SchedulePreviewDialog
          schedule={preview}
          exportInput={{ clientId, principalAmount: principal, tenureYears, startDate }}
          clientName={clients.find((c) => c.id === clientId)?.name}
          disabled={belowMinimum}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Investment details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label>Client</Label>
                <Controller
                  control={control}
                  name="clientId"
                  render={({ field }) => (
                    <ClientCombobox clients={clients} value={field.value} onChange={field.onChange} />
                  )}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="principalAmount">Principal amount (₹)</Label>
                <Input
                  id="principalAmount"
                  type="number"
                  step="1000"
                  placeholder={settings.minimumInvestment.toString()}
                  {...register("principalAmount")}
                />
                {belowMinimum && (
                  <p className="text-sm text-destructive">
                    Minimum investment is {formatINR(settings.minimumInvestment)}.
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Label>Tenure</Label>
                <Controller
                  control={control}
                  name="tenureSelection"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {definedPlans.map((plan) => (
                          <SelectItem key={plan.tenureYears} value={String(plan.tenureYears)}>
                            {plan.label} — {plan.ratePercent}% {settings.rateBasis === "MONTHLY" ? "/mo" : "/yr"}
                          </SelectItem>
                        ))}
                        {flatPlan && (
                          <SelectItem value="custom">
                            More than {maxDefinedTenure} years (flat {flatPlan.ratePercent}%)
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  )}
                />
                {tenureSelection === "custom" && (
                  <Input
                    type="number"
                    min={maxDefinedTenure + 1}
                    placeholder={`e.g. ${maxDefinedTenure + 2}`}
                    {...register("customTenureYears")}
                  />
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="startDate">Start date</Label>
                <Input id="startDate" type="date" {...register("startDate")} />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea id="notes" rows={2} {...register("notes")} />
              </div>

              <Button type="submit" disabled={submitting || belowMinimum || !preview} className="mt-1">
                {submitting ? "Creating..." : "Create investment"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Repayment preview</CardTitle>
          </CardHeader>
          <CardContent>
            {!preview ? (
              <Alert>
                <AlertCircle className="size-4" />
                <AlertDescription>Fill in the amount and tenure to see the projected schedule.</AlertDescription>
              </Alert>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <SummaryRow label="Rate applied" value={`${preview.ratePercent}% ${settings.rateBasis === "MONTHLY" ? "per month" : "per annum"}`} />
                  <SummaryRow label="Payout structure" value={settings.payoutType === "INTEREST_ONLY" ? "Interest-only" : "Amortizing (EMI)"} />
                  <SummaryRow label="Monthly payout (1st)" value={formatINR(preview.entries[0].totalPayout)} />
                  <SummaryRow label="Total interest" value={formatINR(preview.totalInterest)} />
                  <SummaryRow label="Total payout" value={formatINR(preview.totalPayout)} />
                  <SummaryRow label="Installments" value={String(preview.entries.length)} />
                </div>

                <div className="rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-muted/50 text-xs text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 text-left">#</th>
                        <th className="px-3 py-2 text-left">Due</th>
                        <th className="px-3 py-2 text-right">Interest</th>
                        <th className="px-3 py-2 text-right">Principal</th>
                        <th className="px-3 py-2 text-right">Payout</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {preview.entries.slice(0, 3).map((e) => (
                        <PreviewRow key={e.installmentNo} entry={e} />
                      ))}
                      {preview.entries.length > 4 && (
                        <tr>
                          <td colSpan={5} className="px-3 py-1.5 text-center text-xs text-muted-foreground">
                            ⋯ {preview.entries.length - 4} more installments ⋯
                          </td>
                        </tr>
                      )}
                      {preview.entries.length > 3 && (
                        <PreviewRow entry={preview.entries[preview.entries.length - 1]} />
                      )}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-muted-foreground">
                  Use &ldquo;View full schedule&rdquo; above to see every installment and export it as PDF/Excel.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col rounded-md bg-muted/40 px-3 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function PreviewRow({ entry }: { entry: ReturnType<typeof computeSchedule>["entries"][number] }) {
  return (
    <tr>
      <td className="px-3 py-1.5 tabular-nums">{entry.installmentNo}</td>
      <td className="px-3 py-1.5">{new Date(entry.dueDate).toLocaleDateString("en-IN")}</td>
      <td className="px-3 py-1.5 text-right tabular-nums">{formatINR(entry.interestAmount)}</td>
      <td className="px-3 py-1.5 text-right tabular-nums">{formatINR(entry.principalAmount)}</td>
      <td className="px-3 py-1.5 text-right font-medium tabular-nums">{formatINR(entry.totalPayout)}</td>
    </tr>
  );
}
