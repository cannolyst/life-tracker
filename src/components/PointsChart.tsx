"use client";

import { useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { JEWELS } from "@/lib/jewels";

type ChartGranularity = "day" | "week" | "month" | "year";
type ChartPoint = { dateKey: string; label: string; points: number };

const GRANULARITIES: { value: ChartGranularity; label: string }[] = [
  { value: "day", label: "Days" },
  { value: "week", label: "Weeks" },
  { value: "month", label: "Months" },
  { value: "year", label: "Years" },
];

export function PointsChart({ data }: { data: Record<ChartGranularity, ChartPoint[]> }) {
  const [granularity, setGranularity] = useState<ChartGranularity>("day");
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
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={points} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid stroke="rgba(42,36,48,0.10)" strokeDasharray="3 3" />
          <XAxis
            dataKey="dateKey"
            stroke="#8B8394"
            fontSize={12}
            tickFormatter={(value) => labelByKey.get(value) ?? value}
          />
          <YAxis stroke="#8B8394" fontSize={12} width={30} allowDecimals={false} />
          <Tooltip
            contentStyle={{ background: "#FFFFFF", border: "1px solid rgba(42,36,48,0.15)" }}
            labelStyle={{ color: "#2A2430" }}
            labelFormatter={(value) => labelByKey.get(String(value)) ?? String(value)}
          />
          <Bar dataKey="points" fill={JEWELS[0].color} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
