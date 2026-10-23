"use client";

import { FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ExportButtons({ investmentId }: { investmentId: string }) {
  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" asChild>
        <a href={`/api/export/pdf/${investmentId}`} target="_blank" rel="noopener noreferrer">
          <FileText className="size-4" />
          PDF
        </a>
      </Button>
      <Button variant="outline" size="sm" asChild>
        <a href={`/api/export/excel/${investmentId}`}>
          <FileSpreadsheet className="size-4" />
          Excel
        </a>
      </Button>
    </div>
  );
}
