"use client";

import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCompactINR, formatINR } from "@/lib/format";

// Validated categorical order (see dataviz skill) — slots 1-5, fixed order, never cycled.
const CATEGORICAL = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4"];

export function PortfolioByTenureChart({ data }: { data: { label: string; amount: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 24, left: 8, bottom: 0 }} barCategoryGap="30%">
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
          formatter={(value) => [formatINR(Number(value ?? 0)), "Principal outstanding"]}
          contentStyle={{ borderRadius: 8, borderColor: "#e1e0d9", fontSize: 13 }}
        />
        <Bar dataKey="amount" radius={[4, 4, 0, 0]} maxBarSize={48}>
          {data.map((row, i) => (
            <Cell key={row.label} fill={CATEGORICAL[i % CATEGORICAL.length]} />
          ))}
          <LabelList
            dataKey="amount"
            position="top"
            formatter={(value) => formatCompactINR(Number(value ?? 0))}
            style={{ fill: "#52514e", fontSize: 12 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
