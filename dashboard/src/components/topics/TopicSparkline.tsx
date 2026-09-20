"use client";

import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";
import { cn } from "@/lib/cn";

type TopicSparklineProps = {
  data: { day: string; count: number }[];
  color: string;
};

export function TopicSparkline({ data, color }: TopicSparklineProps) {
  if (data.length === 0) return null;

  return (
    <div className={cn("h-10 w-full", color)}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <YAxis domain={["dataMin", "dataMax + 1"]} hide />
          <Line
            type="monotone"
            dataKey="count"
            stroke="currentColor"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
