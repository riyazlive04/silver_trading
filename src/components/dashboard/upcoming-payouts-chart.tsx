"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCompactINR, formatINR } from "@/lib/format";

const SEQUENTIAL_BLUE = "#2a78d6";

export function UpcomingPayoutsChart({ data }: { data: { label: string; amount: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }} barCategoryGap="28%">
        <CartesianGrid vertical={false} stroke="#e1e0d9" strokeDasharray="0" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={{ stroke: "#c3c2b7" }}
          tick={{ fill: "#898781", fontSize: 12 }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fill: "#898781", fontSize: 12 }}
          tickFormatter={(v) => formatCompactINR(Number(v))}
          width={56}
        />
        <Tooltip
          cursor={{ fill: "rgba(11,11,11,0.04)" }}
          formatter={(value) => [formatINR(Number(value ?? 0)), "Projected payout"]}
          contentStyle={{ borderRadius: 8, borderColor: "#e1e0d9", fontSize: 13 }}
        />
        <Bar dataKey="amount" fill={SEQUENTIAL_BLUE} radius={[4, 4, 0, 0]} maxBarSize={32} />
      </BarChart>
    </ResponsiveContainer>
  );
}
