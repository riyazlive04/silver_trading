"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Ban, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateInvestmentStatus } from "@/lib/actions/investments";
import type { InvestmentStatus } from "@prisma/client";

export function InvestmentStatusActions({ id, status }: { id: string; status: InvestmentStatus }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  if (status !== "ACTIVE") return null;

  const act = (next: InvestmentStatus, label: string) => {
    startTransition(async () => {
      try {
        await updateInvestmentStatus(id, next);
        toast.success(`Investment marked ${label}.`);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not update status.");
      }
    });
  };

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" disabled={isPending} onClick={() => act("CLOSED", "closed")}>
        <CheckCircle className="size-4" />
        Close
      </Button>
      <Button variant="outline" size="sm" disabled={isPending} onClick={() => act("CANCELLED", "cancelled")}>
        <Ban className="size-4" />
        Cancel
      </Button>
    </div>
  );
}
