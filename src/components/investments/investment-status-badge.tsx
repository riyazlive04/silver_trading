import { Badge } from "@/components/ui/badge";

const STATUS_CONFIG = {
  ACTIVE: { label: "Active", variant: "default" as const },
  CLOSED: { label: "Closed", variant: "secondary" as const },
  CANCELLED: { label: "Cancelled", variant: "destructive" as const },
};

export function InvestmentStatusBadge({ status }: { status: keyof typeof STATUS_CONFIG }) {
  const config = STATUS_CONFIG[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
