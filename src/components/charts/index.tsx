import * as React from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AXIS_STYLE, CHART_COLORS, GRID_STYLE, TONE_STYLES } from '@/lib/theme';
import { formatCompact, formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';

/* ============================================================================
 * Chart primitives.
 * Every chart is wrapped so axis/grid/legend/tooltip styling stays identical
 * across modules, and each one degrades gracefully when data is empty.
 * ==========================================================================*/

const AXIS_PROPS = {
  stroke: AXIS_STYLE.stroke,
  tick: { fill: AXIS_STYLE.tick.fill, fontSize: AXIS_STYLE.fontSize },
  tickLine: false,
  axisLine: { stroke: AXIS_STYLE.stroke },
} as const;

interface ChartFrameProps {
  height?: number;
  className?: string;
  children: React.ReactElement;
  isEmpty?: boolean;
  emptyLabel?: string;
}

function ChartFrame({ height = 260, className, children, isEmpty, emptyLabel = 'No data for this selection' }: ChartFrameProps) {
  if (isEmpty) {
    return (
      <div
        className={cn('flex items-center justify-center rounded-lg border border-dashed border-ink-200 text-xs text-ink-400', className)}
        style={{ height }}
      >
        {emptyLabel}
      </div>
    );
  }
  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

/* ------------------------------- Tooltip --------------------------------- */

interface TipEntry {
  name?: string | number;
  value?: string | number;
  color?: string;
  dataKey?: string | number;
  payload?: Record<string, unknown>;
}

export function ChartTooltip({
  active,
  payload,
  label,
  format = 'number',
  suffix = '',
}: {
  active?: boolean;
  payload?: TipEntry[];
  label?: string | number;
  format?: 'number' | 'percent' | 'compact' | 'raw';
  suffix?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-ink-200 bg-white/97 px-3 py-2 shadow-overlay backdrop-blur-sm">
      {label !== undefined ? (
        <p className="mb-1 text-[11px] font-semibold text-ink-900">{String(label)}</p>
      ) : null}
      <ul className="space-y-0.5">
        {payload.map((entry, i) => {
          const v = typeof entry.value === 'number' ? entry.value : Number(entry.value ?? 0);
          const text =
            format === 'percent'
              ? `${v.toFixed(1)}%`
              : format === 'compact'
                ? formatCompact(v)
                : format === 'number'
                  ? formatNumber(v, Number.isInteger(v) ? 0 : 1)
                  : String(entry.value ?? '');
          return (
            <li key={i} className="flex items-center gap-2 text-[11px]">
              <span className="h-2 w-2 shrink-0 rounded-[2px]" style={{ background: entry.color }} />
              <span className="text-ink-600">{entry.name}</span>
              <span className="ml-auto font-semibold text-ink-900 tabular-nums">
                {text}
                {suffix}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* -------------------------------- Legend --------------------------------- */

export function ChartLegend({ labels, className }: { labels: { key: string; label: string; color: string }[]; className?: string }) {
  return (
    <ul className={cn('flex flex-wrap items-center gap-x-4 gap-y-1.5', className)}>
      {labels.map((l) => (
        <li key={l.key} className="flex items-center gap-1.5 text-[11px] text-ink-600">
          <span className="h-2 w-2 rounded-[2px]" style={{ background: l.color }} />
          {l.label}
        </li>
      ))}
    </ul>
  );
}

/* ----------------------------- Line / Area -------------------------------- */

export function TrendLineChart({
  data,
  series,
  xKey = 'label',
  height = 280,
  tooltipFormat = 'number',
  suffix = '',
  yDomain,
  className,
}: {
  data: Record<string, unknown>[];
  series: { key: string; label: string; color?: string }[];
  xKey?: string;
  height?: number;
  tooltipFormat?: 'number' | 'percent' | 'compact' | 'raw';
  suffix?: string;
  yDomain?: [number | 'auto' | 'dataMin', number | 'auto' | 'dataMax'];
  className?: string;
}) {
  const isEmpty = data.length === 0 || series.length === 0;
  return (
    <ChartFrame height={height} className={className} isEmpty={isEmpty}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
        <CartesianGrid {...GRID_STYLE} vertical={false} />
        <XAxis dataKey={xKey} {...AXIS_PROPS} />
        <YAxis {...AXIS_PROPS} width={44} domain={yDomain} />
        <Tooltip content={<ChartTooltip format={tooltipFormat} suffix={suffix} />} cursor={{ stroke: '#b0b8c8', strokeDasharray: '3 3' }} />
        {series.map((s, i) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={s.color ?? [CHART_COLORS.navy, CHART_COLORS.safety, CHART_COLORS.blue, CHART_COLORS.green][i % 4]}
            strokeWidth={2}
            dot={{ r: 2.5, strokeWidth: 0, fill: s.color ?? CHART_COLORS.navy }}
            activeDot={{ r: 4 }}
            strokeDasharray={i > 2 ? '4 3' : undefined}
          />
        ))}
      </LineChart>
    </ChartFrame>
  );
}

export function TrendAreaChart({
  data,
  series,
  xKey = 'label',
  height = 280,
  stacked = true,
  suffix = '',
  className,
}: {
  data: Record<string, unknown>[];
  series: { key: string; label: string; color: string }[];
  xKey?: string;
  height?: number;
  stacked?: boolean;
  suffix?: string;
  className?: string;
}) {
  return (
    <ChartFrame height={height} className={className} isEmpty={data.length === 0}>
      <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
        <defs>
          {series.map((s) => (
            <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity={0.28} />
              <stop offset="100%" stopColor={s.color} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid {...GRID_STYLE} vertical={false} />
        <XAxis dataKey={xKey} {...AXIS_PROPS} />
        <YAxis {...AXIS_PROPS} width={40} />
        <Tooltip content={<ChartTooltip suffix={suffix} />} cursor={{ stroke: '#b0b8c8', strokeDasharray: '3 3' }} />
        {series.map((s) => (
          <Area
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stackId={stacked ? '1' : undefined}
            stroke={s.color}
            strokeWidth={1.75}
            fill={`url(#grad-${s.key})`}
          />
        ))}
      </AreaChart>
    </ChartFrame>
  );
}

/* --------------------------------- Bar ------------------------------------ */

export function BarSeriesChart({
  data,
  series,
  xKey = 'label',
  height = 280,
  stacked = false,
  horizontal = false,
  suffix = '',
  className,
  reference,
}: {
  data: Record<string, unknown>[];
  series: { key: string; label: string; color?: string }[];
  xKey?: string;
  height?: number;
  stacked?: boolean;
  horizontal?: boolean;
  suffix?: string;
  className?: string;
  reference?: { value: number; label: string; color?: string };
}) {
  return (
    <ChartFrame height={height} className={className} isEmpty={data.length === 0}>
      <BarChart
        data={data}
        layout={horizontal ? 'vertical' : 'horizontal'}
        margin={{ top: 8, right: 12, bottom: 0, left: horizontal ? 8 : -8 }}
        barCategoryGap={horizontal ? '22%' : '28%'}
      >
        <CartesianGrid {...GRID_STYLE} vertical={horizontal} horizontal={!horizontal} />
        {horizontal ? (
          <>
            <XAxis type="number" {...AXIS_PROPS} />
            <YAxis type="category" dataKey={xKey} {...AXIS_PROPS} width={120} />
          </>
        ) : (
          <>
            <XAxis dataKey={xKey} {...AXIS_PROPS} />
            <YAxis {...AXIS_PROPS} width={40} />
          </>
        )}
        <Tooltip
          content={<ChartTooltip suffix={suffix} />}
          cursor={{ fill: 'rgba(14,19,28,0.04)' }}
        />
        {reference && !horizontal ? (
          <ReferenceLine
            y={reference.value}
            stroke={reference.color ?? TONE_STYLES.warning.hex}
            strokeDasharray="5 4"
            label={{ value: reference.label, position: 'right', fill: CHART_COLORS.slate, fontSize: 10 }}
          />
        ) : null}
        {series.map((s, i) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.label}
            stackId={stacked ? '1' : undefined}
            fill={s.color ?? [CHART_COLORS.navy, CHART_COLORS.safety, CHART_COLORS.blue, CHART_COLORS.green, CHART_COLORS.amber][i % 5]}
            radius={stacked ? 0 : horizontal ? [0, 3, 3, 0] : [3, 3, 0, 0]}
            maxBarSize={horizontal ? 18 : 34}
          />
        ))}
      </BarChart>
    </ChartFrame>
  );
}

/* ------------------------------- Composed --------------------------------- */

export function ComboChart({
  data,
  bars,
  line,
  xKey = 'label',
  height = 280,
  suffix = '',
  reference,
  className,
}: {
  data: Record<string, unknown>[];
  bars: { key: string; label: string; color?: string }[];
  line: { key: string; label: string; color?: string; axis?: 'left' | 'right' };
  xKey?: string;
  height?: number;
  suffix?: string;
  reference?: { value: number; label: string; color?: string };
  className?: string;
}) {
  return (
    <ChartFrame height={height} className={className} isEmpty={data.length === 0}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
        <CartesianGrid {...GRID_STYLE} vertical={false} />
        <XAxis dataKey={xKey} {...AXIS_PROPS} />
        <YAxis yAxisId="left" {...AXIS_PROPS} width={40} />
        <YAxis yAxisId="right" orientation="right" {...AXIS_PROPS} width={40} />
        <Tooltip content={<ChartTooltip suffix={suffix} />} cursor={{ fill: 'rgba(14,19,28,0.04)' }} />
        {reference ? (
          <ReferenceLine
            yAxisId="left"
            y={reference.value}
            stroke={reference.color ?? TONE_STYLES.warning.hex}
            strokeDasharray="5 4"
            label={{ value: reference.label, position: 'insideTopRight', fill: CHART_COLORS.slate, fontSize: 10 }}
          />
        ) : null}
        {bars.map((b, i) => (
          <Bar
            key={b.key}
            yAxisId="left"
            dataKey={b.key}
            name={b.label}
            fill={b.color ?? [CHART_COLORS.navy, CHART_COLORS.safety][i % 2]}
            radius={[3, 3, 0, 0]}
            maxBarSize={26}
          />
        ))}
        <Line
          yAxisId="right"
          type="monotone"
          dataKey={line.key}
          name={line.label}
          stroke={line.color ?? CHART_COLORS.red}
          strokeWidth={2}
          dot={{ r: 2.5, strokeWidth: 0 }}
        />
      </ComposedChart>
    </ChartFrame>
  );
}

/* --------------------------------- Pie ------------------------------------ */

export function DonutChart({
  data,
  height = 240,
  valueKey = 'value',
  nameKey = 'name',
  colors,
  showLegend = true,
  centerLabel,
  centerValue,
  className,
}: {
  data: { name: string; value: number; color?: string }[];
  height?: number;
  valueKey?: string;
  nameKey?: string;
  colors?: string[];
  showLegend?: boolean;
  centerLabel?: string;
  centerValue?: string;
  className?: string;
}) {
  const palette = colors ?? [CHART_COLORS.navy, CHART_COLORS.safety, CHART_COLORS.blue, CHART_COLORS.amber, CHART_COLORS.green, CHART_COLORS.red, CHART_COLORS.violet, CHART_COLORS.teal];
  const total = data.reduce((a, d) => a + d.value, 0);
  void valueKey;
  void nameKey;

  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip content={<ChartTooltip />} />
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius="58%"
            outerRadius="82%"
            paddingAngle={data.length > 1 ? 1.5 : 0}
            stroke="none"
          >
            {data.map((d, i) => (
              <Cell key={d.name} fill={d.color ?? palette[i % palette.length]} />
            ))}
          </Pie>
          {centerValue ? (
            <text x="50%" y="47%" textAnchor="middle" dominantBaseline="middle" className="fill-ink-900 text-xl font-semibold">
              {centerValue}
            </text>
          ) : null}
          {centerLabel ? (
            <text x="50%" y="60%" textAnchor="middle" dominantBaseline="middle" className="fill-ink-500 text-[10px]">
              {centerLabel}
            </text>
          ) : null}
        </PieChart>
      </ResponsiveContainer>
      {showLegend ? (
        <ul className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
          {data.map((d, i) => (
            <li key={d.name} className="flex items-center gap-1.5 text-[11px] text-ink-600">
              <span className="h-2 w-2 shrink-0 rounded-[2px]" style={{ background: d.color ?? palette[i % palette.length] }} />
              <span className="truncate" title={d.name}>
                {d.name}
              </span>
              <span className="ml-auto font-semibold text-ink-800 tabular-nums">
                {total > 0 ? `${((d.value / total) * 100).toFixed(0)}%` : '0%'}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/* -------------------------------- Radar ----------------------------------- */

export function RadarChartPanel({
  data,
  series,
  height = 280,
  className,
}: {
  data: Record<string, string | number>[];
  series: { key: string; label: string; color?: string }[];
  height?: number;
  className?: string;
}) {
  return (
    <ChartFrame height={height} className={className} isEmpty={data.length === 0}>
      <RadarChart data={data} outerRadius="72%">
        <PolarGrid stroke="#d5d9e2" />
        <PolarAngleAxis dataKey="axis" tick={{ fill: AXIS_STYLE.tick.fill, fontSize: 10 }} />
        <PolarRadiusAxis tick={false} axisLine={false} />
        <Tooltip content={<ChartTooltip />} />
        {series.map((s, i) => (
          <Radar
            key={s.key}
            dataKey={s.key}
            name={s.label}
            stroke={s.color ?? [CHART_COLORS.safety, CHART_COLORS.navy][i % 2]}
            fill={s.color ?? [CHART_COLORS.safety, CHART_COLORS.navy][i % 2]}
            fillOpacity={0.18}
          />
        ))}
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </RadarChart>
    </ChartFrame>
  );
}

/* ------------------------------ Heat cells -------------------------------- */

/**
 * Matrix heat map rendered with plain CSS grid — no chart lib needed, and it
 * prints cleanly.
 */
export function HeatMatrix({
  rows,
  columns,
  cells,
  format = (v: number) => formatNumber(v, 0),
  className,
  cellHeight = 30,
}: {
  rows: { key: string; label: string }[];
  columns: { key: string; label: string }[];
  cells: Record<string, number>;
  format?: (v: number) => string;
  className?: string;
  cellHeight?: number;
}) {
  const all = Object.values(cells);
  const max = Math.max(1, ...all);
  const min = Math.min(0, ...all);

  return (
    <div className={cn('data-grid-scroll', className)}>
      <div
        className="grid min-w-max gap-1"
        style={{ gridTemplateColumns: `minmax(140px,1.2fr) repeat(${columns.length}, minmax(44px,1fr))` }}
      >
        <div />
        {columns.map((c) => (
          <div key={c.key} className="px-1 pb-1 text-center text-[10px] font-semibold text-ink-500">
            {c.label}
          </div>
        ))}
        {rows.map((r) => (
          <React.Fragment key={r.key}>
            <div className="flex items-center truncate pr-2 text-[11px] font-medium text-ink-700" title={r.label}>
              {r.label}
            </div>
            {columns.map((c) => {
              const v = cells[`${r.key}|${c.key}`] ?? 0;
              const t = max === min ? 0 : (v - min) / (max - min);
              return (
                <div
                  key={c.key}
                  className="flex items-center justify-center rounded text-[10px] font-semibold tabular-nums"
                  style={{
                    height: cellHeight,
                    background: v === 0 ? '#f6f7f9' : `rgba(249, 115, 22, ${0.1 + t * 0.75})`,
                    color: v === 0 ? '#8590a6' : t > 0.55 ? '#ffffff' : '#2c3444',
                  }}
                  title={`${r.label} · ${c.label}: ${format(v)}`}
                >
                  {format(v)}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
