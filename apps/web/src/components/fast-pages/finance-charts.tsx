"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { money } from "./phase-shared";

type CashFlowRow = {
  key: string;
  label: string;
  time?: number | null;
  cashIn: number;
  cashOut: number;
  netCash: number;
};

type CompositionRow = {
  name: string;
  value: number;
  color: string;
};

export function CashFlowChart({ rows, range = "oneMonth" }: { rows: CashFlowRow[]; range?: "threeMonths" | "oneMonth" | "sevenDays" | "oneDay" }) {
  const isOneDay = range === "oneDay";
  const firstTime = rows.find((row) => typeof row.time === "number")?.time ?? new Date().setHours(0, 0, 0, 0);
  const dayStart = new Date(firstTime).setHours(0, 0, 0, 0);
  const dayEnd = dayStart + 24 * 60 * 60 * 1000;
  const hourlyTicks = Array.from({ length: 24 }, (_, index) => dayStart + index * 60 * 60 * 1000);
  const formatHour = (value: number | string) => {
    const date = new Date(Number(value));
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  };

  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
      <AreaChart data={rows}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        {isOneDay ? (
          <XAxis
            dataKey="time"
            type="number"
            domain={[dayStart, dayEnd]}
            ticks={hourlyTicks}
            tick={{ fontSize: 11 }}
            tickFormatter={formatHour}
          />
        ) : (
          <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" minTickGap={16} />
        )}
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(value) => `${Math.round(Number(value) / 1000000)}jt`} width={48} />
        <Tooltip formatter={(value, name) => [money(Number(value)), name === "cashIn" || name === "Masuk" ? "Masuk" : "Keluar"]} labelFormatter={(value) => isOneDay ? `Pukul ${formatHour(value)}` : `Tanggal ${value}`} />
        <Area type="monotone" dataKey="cashIn" name="Masuk" stroke="#10b981" fill="#10b981" fillOpacity={0.15} strokeWidth={2} dot={isOneDay ? { r: 1.8, strokeWidth: 1 } : false} activeDot={{ r: 4 }} />
        <Area type="monotone" dataKey="cashOut" name="Keluar" stroke="#ef4444" fill="#ef4444" fillOpacity={0.15} strokeWidth={2} dot={isOneDay ? { r: 1.8, strokeWidth: 1 } : false} activeDot={{ r: 4 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function CashCompositionChart({ rows, compact = false }: { rows: CompositionRow[]; compact?: boolean }) {
  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
      <PieChart>
        <Pie data={rows} dataKey="value" nameKey="name" innerRadius={compact ? 34 : 50} outerRadius={compact ? 56 : 78}>
          {rows.map((item) => <Cell key={item.name} fill={item.color} />)}
        </Pie>
        <Tooltip formatter={(value) => money(Number(value))} />
      </PieChart>
    </ResponsiveContainer>
  );
}
