"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { JEWELS } from "@/lib/jewels";

type Point = { dateKey: string; label: string; score: number };

export function ExerciseHistoryChart({ data, unitLabel }: { data: Point[]; unitLabel: string }) {
  const labelByKey = new Map(data.map((p) => [p.dateKey, p.label]));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid stroke="rgba(42,36,48,0.10)" strokeDasharray="3 3" />
        <XAxis
          dataKey="dateKey"
          stroke="#8B8394"
          fontSize={12}
          tickFormatter={(value) => labelByKey.get(value) ?? value}
        />
        <YAxis stroke="#8B8394" fontSize={12} width={40} allowDecimals={false} />
        <Tooltip
          contentStyle={{ background: "#FFFFFF", border: "1px solid rgba(42,36,48,0.15)" }}
          labelStyle={{ color: "#2A2430" }}
          labelFormatter={(value) => labelByKey.get(String(value)) ?? String(value)}
          formatter={(value) => [`${value} ${unitLabel}`, "Best set"]}
        />
        <Bar dataKey="score" fill={JEWELS[0].color} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
