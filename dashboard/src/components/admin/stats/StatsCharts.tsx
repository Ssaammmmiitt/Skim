"use client";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/cn";
import * as ui from "@/lib/tailwind-ui";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorAlert } from "@/components/ui/ErrorAlert";

type StatsData = {
  pipeline: {
    run_date: string;
    articles_ingested: number;
    articles_embedded: number;
    duration_seconds: number;
  }[];
  digests: {
    digest_date: string;
    story_count: number;
  }[];
  topics: { name: string; value: number }[];
  sources: { name: string; value: number }[];
  scores: { score: number; count: number }[];
};

const THEME_COLORS = {
  cyan: "var(--skim-cyan-core)",
  muted: "var(--skim-cyan-muted)",
  bright: "var(--skim-cyan-bright)",
  background: "var(--skim-surface)",
  foreground: "var(--skim-foreground)",
  secondary: "var(--skim-secondary)",
  grid: "var(--skim-surface-raised)",
};

const CHART_PALETTE = [
  "#06b6d4", // Cyan
  "#0ea5e9", // Sky
  "#3b82f6", // Blue
  "#14b8a6", // Teal
  "#8b5cf6", // Violet
  "#6366f1", // Indigo
  "#0284c7", // Dark Sky
  "#0d9488", // Dark Teal
  "#22d3ee", // Bright Cyan
  "#38bdf8", // Bright Sky
];

export function StatsCharts() {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/admin/stats");
        if (!res.ok) throw new Error("Failed to load statistics");
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (error) {
    return (
      <ErrorAlert
        message={error}
        onRetry={() => window.location.reload()}
      />
    );
  }

  if (loading || !data) {
    return (
      <div className="mt-8">
        <EmptyState
          eyebrow="Loading"
          title="Loading Analytics"
          description="Fetching pipeline metrics and article distributions..."
        />
      </div>
    );
  }

  return (
    <div className="mt-8 flex flex-col gap-8 pb-16">
      {/* Volume Chart */}
      <div className={cn(ui.card, "p-5 sm:p-8")}>
        <h3 className="mb-6 text-lg font-bold">Pipeline Volume (Last 14 Days)</h3>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.pipeline}>
              <defs>
                <linearGradient id="colorIngested" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_PALETTE[2]} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={CHART_PALETTE[2]} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={THEME_COLORS.grid} vertical={false} />
              <XAxis 
                dataKey="run_date" 
                stroke={THEME_COLORS.secondary} 
                fontSize={12} 
                tickMargin={10} 
                tickFormatter={(val) => val.split("-").slice(1).join("/")}
              />
              <YAxis stroke={THEME_COLORS.secondary} fontSize={12} tickMargin={10} />
              <Tooltip 
                contentStyle={{ backgroundColor: THEME_COLORS.background, borderColor: THEME_COLORS.grid, color: THEME_COLORS.foreground, borderRadius: '12px' }} 
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Area 
                type="monotone" 
                dataKey="articles_ingested" 
                name="Articles Ingested"
                stroke={CHART_PALETTE[2]} 
                fillOpacity={1} 
                fill="url(#colorIngested)" 
              />
              <Area 
                type="monotone" 
                dataKey="articles_embedded" 
                name="Articles Embedded"
                stroke={CHART_PALETTE[0]} 
                fill="transparent" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Topic Distribution */}
        <div className={cn(ui.card, "p-5 sm:p-8")}>
          <h3 className="mb-6 text-lg font-bold">Topic Distribution (Last 1000)</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.topics}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {data.topics.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_PALETTE[index % CHART_PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: THEME_COLORS.background, borderColor: THEME_COLORS.grid, color: THEME_COLORS.foreground, borderRadius: '12px' }} 
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Score Distribution */}
        <div className={cn(ui.card, "p-5 sm:p-8")}>
          <h3 className="mb-6 text-lg font-bold">AI Importance Score Distribution</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.scores}>
                <CartesianGrid strokeDasharray="3 3" stroke={THEME_COLORS.grid} vertical={false} />
                <XAxis dataKey="score" stroke={THEME_COLORS.secondary} fontSize={12} tickMargin={10} />
                <YAxis stroke={THEME_COLORS.secondary} fontSize={12} tickMargin={10} />
                <Tooltip 
                  cursor={{ fill: THEME_COLORS.grid, opacity: 0.4 }}
                  contentStyle={{ backgroundColor: THEME_COLORS.background, borderColor: THEME_COLORS.grid, color: THEME_COLORS.foreground, borderRadius: '12px' }} 
                />
                <Bar dataKey="count" name="Articles" fill={CHART_PALETTE[1]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Sources Chart */}
      <div className={cn(ui.card, "p-5 sm:p-8")}>
        <h3 className="mb-6 text-lg font-bold">Top Sources (Last 1000)</h3>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.sources.slice(0, 15)} layout="vertical" margin={{ left: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={THEME_COLORS.grid} horizontal={false} />
              <XAxis type="number" stroke={THEME_COLORS.secondary} fontSize={12} />
              <YAxis 
                type="category" 
                dataKey="name" 
                stroke={THEME_COLORS.secondary} 
                fontSize={11} 
                width={80} 
              />
              <Tooltip 
                cursor={{ fill: THEME_COLORS.grid, opacity: 0.4 }}
                contentStyle={{ backgroundColor: THEME_COLORS.background, borderColor: THEME_COLORS.grid, color: THEME_COLORS.foreground, borderRadius: '12px' }} 
              />
              <Bar dataKey="value" name="Articles" fill={CHART_PALETTE[3]} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
