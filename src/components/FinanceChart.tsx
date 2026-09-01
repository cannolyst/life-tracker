"use client";

import { useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { JEWELS } from "@/lib/jewels";
import { formatCurrency } from "@/components/ui";

type FinanceChartGranularity = "week" | "month";
type FinanceChartPoint = { dateKey: string; label: string; saved: number; paidDebt: number };

const GRANULARITIES: { value: FinanceChartGranularity; label: string }[] = [
  { value: "week", label: "Week over week" },
  { value: "month", label: "Month over month" },
];

const SAVED_COLOR = JEWELS[2].color;
const PAID_DEBT_COLOR = JEWELS[1].color;

export function FinanceChart({ data }: { data: Record<FinanceChartGranularity, FinanceChartPoint[]> }) {
  const [granularity, setGranularity] = useState<FinanceChartGranularity>("month");
  const points = data[granularity];
  const labelByKey = new Map(points.map((p) => [p.dateKey, p.label]));

  return (
    <div>
      <div className="mb-3 flex gap-1">
        {GRANULARITIES.map((g) => (
          <button
            key={g.value}
            type="button"
            onClick={() => setGranularity(g.value)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium ${
              granularity === g.value
                ? "bg-neutral-100 text-neutral-900"
                : "text-neutral-500 hover:text-neutral-900"
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={points} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid stroke="rgba(42,36,48,0.10)" strokeDasharray="3 3" />
          <XAxis
            dataKey="dateKey"
            stroke="#8B8394"
            fontSize={12}
            tickFormatter={(value) => labelByKey.get(value) ?? value}
          />
          <YAxis
            stroke="#8B8394"
            fontSize={12}
            width={50}
            tickFormatter={(value) => formatCurrency(value).replace(".00", "")}
          />
          <Tooltip
            contentStyle={{ background: "#FFFFFF", border: "1px solid rgba(42,36,48,0.15)" }}
            labelStyle={{ color: "#2A2430" }}
            formatter={(value) => formatCurrency(Number(value))}
            labelFormatter={(value) => labelByKey.get(String(value)) ?? String(value)}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: "#8B8394" }} />
          <Bar dataKey="saved" name="Saved" fill={SAVED_COLOR} radius={[4, 4, 0, 0]} />
          <Bar dataKey="paidDebt" name="Paid toward debt" fill={PAID_DEBT_COLOR} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
