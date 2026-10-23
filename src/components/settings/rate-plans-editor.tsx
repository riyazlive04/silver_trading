"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { saveRatePlans } from "@/lib/actions/settings";
import type { RatePlanInput } from "@/lib/validations/settings";

export function RatePlansEditor({ initial }: { initial: RatePlanInput[] }) {
  const router = useRouter();
  const [plans, setPlans] = useState<RatePlanInput[]>(initial);
  const [submitting, setSubmitting] = useState(false);

  const numericPlans = plans.filter((p) => p.tenureYears !== null);
  const flatPlan = plans.find((p) => p.tenureYears === null);

  const updatePlan = (index: number, patch: Partial<RatePlanInput>) => {
    setPlans((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  };

  const addTenurePlan = () => {
    const maxTenure = numericPlans.reduce((max, p) => Math.max(max, p.tenureYears ?? 0), 0);
    const nextTenure = maxTenure + 1;
    setPlans((prev) => [
      ...prev,
      {
        tenureYears: nextTenure,
        label: `${nextTenure} Years`,
        ratePercent: 0,
        isActive: true,
        sortOrder: prev.length,
      },
    ]);
  };

  const addFlatPlan = () => {
    setPlans((prev) => [
      ...prev,
      { tenureYears: null, label: "Above max (flat)", ratePercent: 0, isActive: true, sortOrder: prev.length },
    ]);
  };

  const onSave = async () => {
    setSubmitting(true);
    try {
      const saved = await saveRatePlans(plans);
      setPlans(
        saved.map((p) => ({
          id: p.id,
          tenureYears: p.tenureYears,
          label: p.label,
          ratePercent: p.ratePercent,
          isActive: p.isActive,
          sortOrder: p.sortOrder,
        }))
      );
      toast.success("Rate plans updated.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save rate plans.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tenure (years)</TableHead>
            <TableHead>Label</TableHead>
            <TableHead>Rate (%)</TableHead>
            <TableHead>Active</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {plans.map((plan, i) => (
            <TableRow key={plan.id ?? `new-${i}`}>
              <TableCell className="w-28">
                {plan.tenureYears === null ? (
                  <span className="text-sm text-muted-foreground">Above max</span>
                ) : (
                  <Input
                    type="number"
                    min={1}
                    value={plan.tenureYears}
                    onChange={(e) => updatePlan(i, { tenureYears: Number(e.target.value) })}
                  />
                )}
              </TableCell>
              <TableCell>
                <Input value={plan.label} onChange={(e) => updatePlan(i, { label: e.target.value })} />
              </TableCell>
              <TableCell className="w-32">
                <Input
                  type="number"
                  step="0.1"
                  value={plan.ratePercent}
                  onChange={(e) => updatePlan(i, { ratePercent: Number(e.target.value) })}
                />
              </TableCell>
              <TableCell>
                <Switch checked={plan.isActive} onCheckedChange={(checked) => updatePlan(i, { isActive: checked })} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={addTenurePlan}>
          <Plus className="size-4" />
          Add tenure slab
        </Button>
        {!flatPlan && (
          <Button type="button" variant="outline" size="sm" onClick={addFlatPlan}>
            <Plus className="size-4" />
            Add flat rate above max
          </Button>
        )}
      </div>

      <Button onClick={onSave} disabled={submitting} className="self-end">
        {submitting ? "Saving..." : "Save rate plans"}
      </Button>
    </div>
  );
}
