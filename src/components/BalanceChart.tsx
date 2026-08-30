"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { formatCurrency } from "./ui";

export function BalanceChart({
  points,
}: {
  points: { date: string; balance: number }[];
}) {
  if (points.length < 2) {
    return (
      <p className="py-8 text-center text-sm text-neutral-500">
        Add a few transactions to see a balance chart.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={points} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid stroke="rgba(42,36,48,0.10)" strokeDasharray="3 3" />
        <XAxis dataKey="date" stroke="#8B8394" fontSize={12} />
        <YAxis
          stroke="#8B8394"
          fontSize={12}
          tickFormatter={(v) => formatCurrency(v)}
          width={80}
        />
        <Tooltip
          contentStyle={{ background: "#FFFFFF", border: "1px solid rgba(42,36,48,0.15)" }}
          labelStyle={{ color: "#2A2430" }}
          formatter={(value) => formatCurrency(Number(value))}
        />
        <Line
          type="monotone"
          dataKey="balance"
          stroke="#2E7D5C"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
