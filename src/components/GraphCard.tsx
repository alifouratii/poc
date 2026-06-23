import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";

import type { GraphPoint } from "../types/robocare";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "./ui/chart";

type GraphCardProps = {
  points: GraphPoint[];
};

const chartConfig = {
  value: {
    label: "Value",
    color: "#40b3e2",
  },
} satisfies ChartConfig;

function formatChartValue(value: number) {
  return value.toFixed(4);
}

export function GraphCard({ points }: GraphCardProps) {
  if (points.length === 0) {
    return <div className="empty-card">Graph loading...</div>;
  }

  const numericValues = points.map((point) => point.value);
  const minValue = Math.min(...numericValues);
  const maxValue = Math.max(...numericValues);
  const padding = Math.max((maxValue - minValue) * 0.12, 0.005);

  return (
    <section className="panel graph-chart-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Shadcn/ui chart</p>
          <h2>Vegetation evolution</h2>
        </div>
      </div>

      <div className="graph-chart-body">
        <ChartContainer config={chartConfig} className="h-[220px] w-full">
          <AreaChart
            accessibilityLayer
            data={points}
            margin={{ top: 18, right: 18, bottom: 8, left: 0 }}
          >
            <defs>
              <linearGradient
                id="vegetationValueGradient"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="5%" stopColor="#40b3e2" stopOpacity={0.34} />
                <stop offset="70%" stopColor="#45c979" stopOpacity={0.1} />
                <stop offset="100%" stopColor="#45c979" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid vertical={false} strokeDasharray="4 8" />

            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tickMargin={12}
            />

            <YAxis
              width={50}
              axisLine={false}
              tickLine={false}
              tickMargin={8}
              domain={[minValue - padding, maxValue + padding]}
              tickFormatter={(value) => Number(value).toFixed(3)}
            />

            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  indicator="dot"
                  labelFormatter={(label) => (
                    <div className="font-black text-slate-700">{label}</div>
                  )}
                  formatter={(value) => (
                    <div className="flex items-center justify-between gap-5">
                      <span className="font-bold text-slate-500">Value</span>
                      <span className="font-black tabular-nums text-slate-800">
                        {typeof value === "number"
                          ? formatChartValue(value)
                          : String(value)}
                      </span>
                    </div>
                  )}
                />
              }
            />

            <ReferenceLine
              y={minValue}
              stroke="#cbd5e1"
              strokeDasharray="3 6"
            />

            <Area
              dataKey="value"
              type="monotone"
              fill="url(#vegetationValueGradient)"
              stroke="var(--color-value)"
              strokeWidth={3}
              dot={{ r: 4, fill: "#ffffff", stroke: "#40b3e2", strokeWidth: 2 }}
              activeDot={{
                r: 6,
                fill: "#40b3e2",
                stroke: "#ffffff",
                strokeWidth: 3,
              }}
            />
          </AreaChart>
        </ChartContainer>
      </div>
    </section>
  );
}
