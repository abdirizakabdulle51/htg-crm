"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const usage = [
  { month: "Apr", usage: 68 },
  { month: "May", usage: 76 },
  { month: "Jun", usage: 81 },
];

export function UsageChart() {
  return (
    <div className="h-56">
      <ResponsiveContainer height="100%" width="100%">
        <LineChart data={usage}>
          <XAxis dataKey="month" fontSize={12} />
          <YAxis fontSize={12} />
          <Tooltip />
          <Line dataKey="usage" stroke="#0d9488" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
