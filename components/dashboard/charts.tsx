"use client";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const axis = { fontSize: 11, fill: "#61575C" };
export function TrendChart({ data, keys, height = 260, area = false }: { data: any[]; keys: { key: string; color: string; name: string; dashed?: boolean }[]; height?: number; area?: boolean }) {
  const C: any = area ? AreaChart : LineChart;
  return (
    <div style={{ height }} role="img" aria-label="Trend chart">
      <ResponsiveContainer width="100%" height="100%">
        <C data={data}><CartesianGrid stroke="#EBEDEE" vertical={false} /><XAxis dataKey="date" tick={axis} tickLine={false} axisLine={false} minTickGap={24} /><YAxis tick={axis} tickLine={false} axisLine={false} width={48} />
          <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #EBEDEE", fontSize: 12 }} /><Legend wrapperStyle={{ fontSize: 12 }} />
          {keys.map((k) => area ? <Area key={k.key} dataKey={k.key} name={k.name} stroke={k.color} fill={k.color} fillOpacity={0.12} strokeWidth={2} /> : <Line key={k.key} dataKey={k.key} name={k.name} stroke={k.color} strokeWidth={2} dot={false} strokeDasharray={k.dashed ? "5 4" : undefined} />)}
        </C>
      </ResponsiveContainer>
    </div>
  );
}
export function BarsChart({ data, x, keys, height = 260, layout = "horizontal" }: { data: any[]; x: string; keys: { key: string; color: string; name: string }[]; height?: number; layout?: "horizontal" | "vertical" }) {
  const v = layout === "vertical";
  return (
    <div style={{ height }} role="img" aria-label="Bar chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout={layout} margin={{ left: v ? 20 : 0 }}><CartesianGrid stroke="#EBEDEE" horizontal={!v} vertical={v} />
          {v ? <><XAxis type="number" tick={axis} tickLine={false} axisLine={false} /><YAxis type="category" dataKey={x} width={130} tick={axis} tickLine={false} axisLine={false} /></> : <><XAxis dataKey={x} tick={axis} tickLine={false} axisLine={false} /><YAxis tick={axis} tickLine={false} axisLine={false} width={48} /></>}
          <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #EBEDEE", fontSize: 12 }} />{keys.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
          {keys.map((k) => <Bar key={k.key} dataKey={k.key} name={k.name} fill={k.color} radius={4} />)}</BarChart>
      </ResponsiveContainer>
    </div>
  );
}
