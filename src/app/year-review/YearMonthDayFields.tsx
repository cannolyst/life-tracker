"use client";

import { useState } from "react";
import { inputClass, labelClass } from "@/components/ui";
import { MONTH_OPTIONS } from "./dateDisplay";

export function YearMonthDayFields({
  defaultYear,
  defaultMonth,
  defaultDay,
}: {
  defaultYear: string;
  defaultMonth: string;
  defaultDay: string;
}) {
  const [month, setMonth] = useState(defaultMonth);

  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="space-y-1">
        <label className={labelClass}>Year</label>
        <input
          name="year"
          type="number"
          min="1900"
          max="2999"
          defaultValue={defaultYear}
          required
          className={inputClass}
        />
      </div>
      <div className="space-y-1">
        <label className={labelClass}>Month</label>
        <select
          name="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className={inputClass}
        >
          <option value="">—</option>
          {MONTH_OPTIONS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <label className={labelClass}>Day</label>
        <input
          name="day"
          type="number"
          min="1"
          max="31"
          defaultValue={defaultDay}
          disabled={!month}
          className={`${inputClass} disabled:opacity-50`}
        />
      </div>
    </div>
  );
}
