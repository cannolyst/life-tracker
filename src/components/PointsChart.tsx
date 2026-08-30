"use client";

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

export function PointsChart({ data }: { data: { date: string; points: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid stroke="rgba(42,36,48,0.10)" strokeDasharray="3 3" />
        <XAxis dataKey="date" stroke="#8B8394" fontSize={12} />
        <YAxis stroke="#8B8394" fontSize={12} width={30} allowDecimals={false} />
        <Tooltip
          contentStyle={{ background: "#FFFFFF", border: "1px solid rgba(42,36,48,0.15)" }}
          labelStyle={{ color: "#2A2430" }}
        />
        <Bar dataKey="points" fill={JEWELS[0].color} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
