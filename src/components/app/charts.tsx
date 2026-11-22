'use client';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CHART } from './common';

const axis = { stroke: CHART.muted, fontSize: 11, tickLine: false, axisLine: false } as const;
const shortDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

function Tip({ active, payload, label, format }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string; format?: (v: number) => string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-charcoal/10 bg-white px-3 py-2 text-xs shadow-lift">
      <div className="mb-1 font-semibold text-charcoal">{label && /^\d{4}-\d{2}-\d{2}$/.test(label) ? shortDate(label) : label}</div>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 text-muted"><span className="h-2 w-2 rounded-full" style={{ background: p.color }} />{p.name}<span className="ml-auto pl-3 font-semibold text-charcoal">{format ? format(p.value) : p.value.toLocaleString()}</span></div>
      ))}
    </div>
  );
}

export type SeriesDef = { key: string; name: string; color?: string };

export function TrendChart({ data, series, height = 240, format, type = 'area' }: { data: Record<string, unknown>[]; series: SeriesDef[]; height?: number; format?: (v: number) => string; type?: 'area' | 'line' }) {
  const colors = [CHART.series1, CHART.series2];
  const Chart = type === 'area' ? AreaChart : LineChart;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <Chart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <defs>{series.map((s, i) => (
          <linearGradient key={s.key} id={`g-${s.key}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={s.color ?? colors[i]} stopOpacity={0.22} /><stop offset="100%" stopColor={s.color ?? colors[i]} stopOpacity={0} /></linearGradient>
        ))}</defs>
        <CartesianGrid stroke={CHART.grid} vertical={false} />
        <XAxis dataKey="date" tickFormatter={shortDate} {...axis} minTickGap={24} />
        <YAxis {...axis} tickFormatter={(v) => (format ? format(v) : Number(v).toLocaleString())} width={56} />
        <Tooltip content={<Tip format={format} />} cursor={{ stroke: CHART.muted, strokeDasharray: '3 3' }} />
        {series.length > 1 && <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: CHART.ink }} />}
        {series.map((s, i) => type === 'area'
          ? <Area key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color ?? colors[i]} strokeWidth={2} fill={`url(#g-${s.key})`} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }} />
          : <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color ?? colors[i]} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }} />)}
      </Chart>
    </ResponsiveContainer>
  );
}

export function BarsChart({ data, x, series, height = 240, format, horizontal = false }: { data: Record<string, unknown>[]; x: string; series: SeriesDef[]; height?: number; format?: (v: number) => string; horizontal?: boolean }) {
  const colors = [CHART.series1, CHART.series2];
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout={horizontal ? 'vertical' : 'horizontal'} margin={{ top: 8, right: 12, left: horizontal ? 8 : -12, bottom: 0 }} barGap={2} barCategoryGap="28%">
        <CartesianGrid stroke={CHART.grid} vertical={horizontal} horizontal={!horizontal} />
        {horizontal ? (
          <><XAxis type="number" {...axis} tickFormatter={(v) => (format ? format(v) : Number(v).toLocaleString())} /><YAxis type="category" dataKey={x} {...axis} width={130} /></>
        ) : (
          <><XAxis dataKey={x} {...axis} tickFormatter={(v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v)) ? shortDate(String(v)) : String(v))} minTickGap={8} /><YAxis {...axis} width={56} tickFormatter={(v) => (format ? format(v) : Number(v).toLocaleString())} /></>
        )}
        <Tooltip content={<Tip format={format} />} cursor={{ fill: 'rgba(33,28,31,0.04)' }} />
        {series.length > 1 && <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: CHART.ink }} />}
        {series.map((s, i) => <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color ?? colors[i]} radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]} maxBarSize={28} />)}
      </BarChart>
    </ResponsiveContainer>
  );
}
