"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import { jewelFor } from "@/lib/jewels";

type ChartPoint = { dateKey: string; label: string; [key: string]: string | number | number[] };

// One stacked bar per session: each segment is every set sharing a weight,
// colored by segment index, with height = their combined reps. Hovering
// shows the weight and each individual set's reps, so sets at the same
// weight but different reps aren't hidden by the merge.
export function ExerciseSetsChart({ data, maxSets }: { data: ChartPoint[]; maxSets: number }) {
  const labelByKey = new Map(data.map((p) => [p.dateKey, p.label]));
  const setIndexes = Array.from({ length: maxSets }, (_, i) => i);

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <XAxis
          dataKey="dateKey"
          stroke="#8B8394"
          fontSize={12}
          tickFormatter={(value) => labelByKey.get(value) ?? value}
        />
        <YAxis
          stroke="#8B8394"
          fontSize={12}
          width={40}
          allowDecimals={false}
          label={{ value: "Reps", angle: -90, position: "insideLeft", fill: "#8B8394", fontSize: 12 }}
        />
        <Tooltip
          contentStyle={{ background: "#FFFFFF", border: "1px solid rgba(42,36,48,0.15)" }}
          labelStyle={{ color: "#2A2430" }}
          labelFormatter={(value) => labelByKey.get(String(value)) ?? String(value)}
          formatter={(value, name, item) => {
            const i = String(name).replace("reps_", "");
            const weight = item.payload[`weight_${i}`];
            const repsList = (item.payload[`repsList_${i}`] as number[] | undefined) ?? [];
            const label =
              repsList.length > 1
                ? `${weight} lbs — ${repsList.length} sets: ${repsList.join(", ")} reps`
                : `${weight} lbs × ${repsList[0] ?? value} reps`;
            return [label, `Set ${Number(i) + 1}`];
          }}
        />
        <Legend
          formatter={(value) => `Set ${Number(String(value).replace("reps_", "")) + 1}`}
          wrapperStyle={{ fontSize: 12, color: "#8B8394" }}
        />
        {setIndexes.map((i) => (
          <Bar key={i} dataKey={`reps_${i}`} stackId="sets" fill={jewelFor(i).color} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
