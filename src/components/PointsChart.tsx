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

export function PointsChart({ data }: { data: { date: string; points: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid stroke="#262626" strokeDasharray="3 3" />
        <XAxis dataKey="date" stroke="#737373" fontSize={12} />
        <YAxis stroke="#737373" fontSize={12} width={30} allowDecimals={false} />
        <Tooltip
          contentStyle={{ background: "#171717", border: "1px solid #404040" }}
          labelStyle={{ color: "#d4d4d4" }}
        />
        <Bar dataKey="points" fill="#a855f7" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
