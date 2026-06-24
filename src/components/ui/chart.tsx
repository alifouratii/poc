import * as React from "react";
import * as RechartsPrimitive from "recharts";

import { cn } from "@/lib/utils";

export type ChartConfig = {
  [key: string]: {
    label?: React.ReactNode;
    color?: string;
  };
};

type ChartContextProps = {
  config: ChartConfig;
};

const ChartContext = React.createContext<ChartContextProps | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);

  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />");
  }

  return context;
}

type ChartContainerProps = React.ComponentProps<"div"> & {
  config: ChartConfig;
  children: React.ReactElement;
};

export function ChartContainer({
  id,
  className,
  children,
  config,
  ...props
}: ChartContainerProps) {
  const uniqueId = React.useId();
  const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={chartId}
        className={cn(
          "flex aspect-video justify-center text-xs",
          "[&_.recharts-cartesian-axis-tick_text]:fill-slate-500",
          "[&_.recharts-cartesian-grid_line]:stroke-slate-200",
          "[&_.recharts-curve.recharts-tooltip-cursor]:stroke-slate-300",
          "[&_.recharts-dot[stroke='#fff']]:stroke-transparent",
          "[&_.recharts-layer]:outline-none",
          "[&_.recharts-sector]:outline-none",
          "[&_.recharts-surface]:outline-none",
          className,
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

function ChartStyle({ id, config }: { id: string; config: ChartConfig }) {
  const colorConfig = Object.entries(config).filter(
    ([, itemConfig]) => itemConfig.color,
  );

  if (!colorConfig.length) {
    return null;
  }

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
[data-chart=${id}] {
${colorConfig
  .map(([key, itemConfig]) => `  --color-${key}: ${itemConfig.color};`)
  .join("\n")}
}
`,
      }}
    />
  );
}

export const ChartTooltip = RechartsPrimitive.Tooltip;
export const ChartLegend = RechartsPrimitive.Legend;

function getPayloadConfigFromPayload(
  config: ChartConfig,
  payload: unknown,
  key: string,
) {
  if (typeof payload !== "object" || payload === null) {
    return config[key];
  }

  const payloadRecord = payload as Record<string, unknown>;
  const nestedPayload = payloadRecord.payload;

  if (typeof nestedPayload === "object" && nestedPayload !== null) {
    const nestedRecord = nestedPayload as Record<string, unknown>;
    const nestedKey = nestedRecord[key];

    if (typeof nestedKey === "string" && config[nestedKey]) {
      return config[nestedKey];
    }
  }

  return config[key];
}

export function ChartTooltipContent({
  active,
  payload,
  className,
  indicator = "dot",
  hideLabel = false,
  hideIndicator = false,
  label,
  labelFormatter,
  formatter,
}: {
  active?: boolean;
  payload?: Array<Record<string, unknown>>;
  className?: string;
  indicator?: "line" | "dot" | "dashed";
  hideLabel?: boolean;
  hideIndicator?: boolean;
  label?: React.ReactNode;
  labelFormatter?: (
    label: React.ReactNode,
    payload: unknown[],
  ) => React.ReactNode;
  formatter?: (
    value: unknown,
    name: unknown,
    item: Record<string, unknown>,
    index: number,
    payload: unknown[],
  ) => React.ReactNode;
}) {
  const { config } = useChart();

  const tooltipLabel = React.useMemo(() => {
    if (!active || !payload?.length || hideLabel) {
      return null;
    }

    if (labelFormatter) {
      return labelFormatter(label, payload);
    }

    if (!label) {
      return null;
    }

    return <div className="font-black text-slate-700">{label}</div>;
  }, [active, hideLabel, label, labelFormatter, payload]);

  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div
      className={cn(
        "grid min-w-[150px] gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-xl",
        className,
      )}
    >
      {tooltipLabel}

      <div className="grid gap-1.5">
        {payload.map((item, index) => {
          const key = String(item.dataKey ?? item.name ?? "value");
          const itemConfig = getPayloadConfigFromPayload(config, item, key);
          const color = String(
            item.color ?? item.fill ?? itemConfig?.color ?? "#86c232",
          );

          if (formatter) {
            return (
              <div key={`${key}-${index}`}>
                {formatter(item.value, item.name, item, index, payload)}
              </div>
            );
          }

          return (
            <div
              key={`${key}-${index}`}
              className="flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2">
                {!hideIndicator && (
                  <span
                    className={cn(
                      "shrink-0 rounded-[2px] border-[--color-border] bg-[--color-bg]",
                      indicator === "dot" && "h-2.5 w-2.5 rounded-full",
                      indicator === "line" && "h-2.5 w-1",
                      indicator === "dashed" &&
                        "h-0 w-4 border-t-2 bg-transparent",
                    )}
                    style={
                      {
                        "--color-bg": color,
                        "--color-border": color,
                      } as React.CSSProperties
                    }
                  />
                )}
                <span className="font-bold text-slate-500">
                  {itemConfig?.label ?? String(item.name ?? key)}
                </span>
              </div>

              <span className="font-black tabular-nums text-slate-800">
                {typeof item.value === "number"
                  ? item.value.toFixed(4)
                  : String(item.value ?? "—")}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ChartLegendContent({
  payload,
  className,
}: {
  payload?: Array<Record<string, unknown>>;
  className?: string;
}) {
  const { config } = useChart();

  if (!payload?.length) {
    return null;
  }

  return (
    <div className={cn("flex items-center justify-center gap-4", className)}>
      {payload.map((item) => {
        const key = String(item.dataKey ?? item.value ?? "value");
        const itemConfig = config[key];
        const color = String(item.color ?? itemConfig?.color ?? "#86c232");

        return (
          <div key={key} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="text-xs font-bold text-slate-500">
              {itemConfig?.label ?? key}
            </span>
          </div>
        );
      })}
    </div>
  );
}
