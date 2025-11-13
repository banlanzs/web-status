"use client";

import dayjs from "dayjs";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type ResponsePoint = {
  at: string;
  value: number;
};

interface ResponseTimeChartProps {
  data: ResponsePoint[];
  label: string;
}

export function ResponseTimeChart({ data, label }: ResponseTimeChartProps) {
  const formatted = data.map((item) => ({
    ...item,
    atLabel: dayjs(item.at).format("MM-DD HH:mm"),
  }));

  return (
    <div className="h-32 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={formatted}
          margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="responseGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.9} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="atLabel"
            tick={{ fontSize: 10, fill: "#4b5563" }}
            hide={formatted.length <= 6}
          />
          <YAxis
            width={60}
            tick={{ fontSize: 10, fill: "#4b5563" }}
            tickFormatter={(value) => `${value}ms`}
          />
          <Tooltip
            cursor={{ stroke: "#10b981", strokeWidth: 1, strokeDasharray: 3 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const item = payload[0];
              return (
                <div className="rounded-md border border-emerald-100 bg-white px-3 py-2 text-xs text-slate-700 shadow-lg">
                  <p className="font-semibold text-emerald-600">
                    {item.value} ms
                  </p>
                  <p>{item.payload.atLabel}</p>
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#10b981"
            fill="url(#responseGradient)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
      <p className="mt-2 text-xs text-slate-500">{label}</p>
    </div>
  );
}

