"use client";

/* eslint-disable @typescript-eslint/no-unused-vars */

import { ReactNode } from "react";
import { Area, Bar, BarChart, CartesianGrid, Cell, ComposedChart, LabelList, Legend, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { EmptyState, statusLabel, type DashboardData } from "./workspace-shared";

type TooltipPayload = {
  payload?: Record<string, unknown>;
  value?: number | string;
  name?: string;
};

type TooltipProps = {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string | number;
};

const academicColors = {
  hadir: "#10b981",
  izin: "#f59e0b",
  sakit: "#3b82f6",
  alfa: "#f43f5e",
  netral: "#94a3b8",
};

const montessoriColors: Record<string, string> = {
  "Practical Life": "#f59e0b",
  Sensorial: "#8b5cf6",
  Language: "#3b82f6",
  Mathematics: "#10b981",
  Culture: "#ef4444",
};

const hafalanColors: Record<string, string> = {
  mutqin: "#059669",
  lancar: "#34d399",
  sedang_dihafal: "#f59e0b",
  belum: "#e2e8f0",
};

function DashboardCard({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`min-w-0 rounded-lg border border-slate-200 bg-white p-4 ${className}`}
    >
      <h3 className="mb-0.5 text-sm font-medium text-slate-950">{title}</h3>
      <p className="mb-3 text-xs leading-4 text-[#64748b]">{subtitle}</p>
      {children}
    </section>
  );
}

export function WeeklyAttendanceTrend({
  mounted,
  rows,
  totalStudents,
}: {
  mounted: boolean;
  rows: NonNullable<DashboardData["analytics"]>["attendanceTrend"];
  totalStudents: number;
}) {
  const chartRows = rows.map((row, index) => {
    const axisLabel =
      row.label?.replace("\n", "|") ??
      `W${row.weekNumber ?? row.week}|${formatShortDayMonth(row.startDate)}`;

    return {
      ...row,
      axisLabel,
      latestHadirLabel: index === rows.length - 1 ? row.hadir : undefined,
    };
  });
  const average =
    chartRows.length > 0
      ? Math.round(chartRows.reduce((sum, row) => sum + row.hadir, 0) / chartRows.length)
      : 0;
  const yMax = Math.max(totalStudents + 5, 5);

  return (
    <DashboardCard
      title="Tren Kehadiran"
      subtitle="Jumlah murid hadir vs tidak hadir (izin+sakit+alfa) per minggu — 8 minggu terakhir"
    >
      {!mounted ? (
        <EmptyState text="Memuat grafik tren kehadiran." />
      ) : chartRows.length > 0 ? (
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <ComposedChart
              data={chartRows}
              margin={{ top: 12, right: 20, bottom: 0, left: -18 }}
            >
              <defs>
                <linearGradient id="hadirGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#bbf7d0" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#d1fae5" stopOpacity={0.25} />
                </linearGradient>
                <linearGradient id="absenGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#fecdd3" stopOpacity={0.85} />
                  <stop offset="100%" stopColor="#ffe4e6" stopOpacity={0.25} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="axisLabel"
                height={34}
                interval={0}
                tick={<WeeklyAxisTick />}
                tickLine={false}
                axisLine={{ stroke: "#e2e8f0" }}
              />
              <YAxis
                width={34}
                domain={[0, yMax]}
                tick={{ fontSize: 11, fill: "#64748b" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<WeeklyAttendanceTooltip />} />
              {average > 0 ? (
                <ReferenceLine
                  y={average}
                  stroke="#94a3b8"
                  strokeDasharray="3 3"
                  label={{
                    value: "Rata-rata",
                    position: "insideRight",
                    fill: "#64748b",
                    fontSize: 11,
                  }}
                />
              ) : null}
              <Legend
                verticalAlign="bottom"
                height={26}
                iconType="circle"
                wrapperStyle={{ fontSize: 12, color: "#475569" }}
              />
              <Area
                type="monotone"
                dataKey="hadir"
                name="Hadir"
                fill="url(#hadirGradient)"
                stroke={academicColors.hadir}
                strokeWidth={2}
                dot={{ r: 2, strokeWidth: 1 }}
                activeDot={{ r: 4 }}
              >
                <LabelList
                  dataKey="latestHadirLabel"
                  position="top"
                  fill="#059669"
                  fontSize={11}
                  fontWeight={600}
                />
              </Area>
              <Area
                type="monotone"
                dataKey="tidakHadir"
                name="Tidak Hadir"
                fill="url(#absenGradient)"
                stroke="#f43f5e"
                strokeWidth={2}
                dot={{ r: 2, strokeWidth: 1 }}
                activeDot={{ r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <EmptyState text="Belum ada data tren absensi mingguan." />
      )}
    </DashboardCard>
  );
}

export function MontessoriProgressChart({
  mounted,
  rows,
}: {
  mounted: boolean;
  rows: NonNullable<DashboardData["analytics"]>["milestoneProgress"];
}) {
  const chartRows = rows.map((row) => {
    const area = row.area ?? row.name ?? "-";
    const pct = row.total > 0 ? Number(row.pct ?? (row.mastered / row.total) * 100) : 0;

    return {
      ...row,
      area,
      shortArea: area === "Mathematics" ? "Math" : area,
      masteredPct: pct,
      remainingPct: Math.max(100 - pct, 0),
      pctLabel: `${Math.round(pct)}%`,
    };
  });

  return (
    <DashboardCard
      title="Pencapaian Montessori"
      subtitle="Persentase milestone mastered dari total milestone per area — semua murid aktif"
    >
      {!mounted ? (
        <EmptyState text="Memuat grafik Montessori." />
      ) : chartRows.length > 0 ? (
        <>
          <div className="grid gap-2.5 sm:hidden">
            {chartRows.map((row) => (
              <ProgressListRow
                key={row.area}
                label={row.area}
                value={row.pctLabel}
                percent={Math.round(row.masteredPct)}
                color={montessoriColors[row.area] ?? academicColors.netral}
              />
            ))}
          </div>
          <div className="hidden h-[180px] w-full sm:block">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <BarChart
              data={chartRows}
              layout="vertical"
              barCategoryGap={8}
              margin={{ top: 2, right: 36, bottom: 0, left: 4 }}
            >
              <XAxis type="number" domain={[0, 100]} hide />
              <YAxis
                type="category"
                dataKey="shortArea"
                width={88}
                tick={{ fontSize: 11, fill: "#475569" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<MontessoriTooltip />} />
              <Bar dataKey="masteredPct" stackId="progress" radius={[4, 0, 0, 4]}>
                {chartRows.map((row) => (
                  <Cell
                    key={row.area}
                    fill={montessoriColors[row.area] ?? academicColors.netral}
                  />
                ))}
              </Bar>
              <Bar
                dataKey="remainingPct"
                stackId="progress"
                fill="#f1f5f9"
                radius={[0, 4, 4, 0]}
              >
                <LabelList content={(props) => renderBarEndLabel(props, chartRows[Number(props.index)]?.pctLabel ?? "0%")} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          </div>
        </>
      ) : (
        <EmptyState text="Belum ada data milestone Montessori." />
      )}
    </DashboardCard>
  );
}

export function ClassCapacityChart({
  mounted,
  rows,
}: {
  mounted: boolean;
  rows: NonNullable<DashboardData["analytics"]>["studentsPerClass"];
}) {
  const chartRows = rows.map((row) => {
    const capacity = Math.max(row.capacity ?? row.studentsCount, row.studentsCount, 1);
    const percent = Math.round((row.studentsCount / capacity) * 100);

    return {
      ...row,
      capacity,
      remainingCapacity: Math.max(capacity - row.studentsCount, 0),
      label: `${row.studentsCount}/${capacity}`,
      percent,
    };
  });

  return (
    <DashboardCard
      title="Kapasitas Kelas"
      subtitle="Jumlah murid terdaftar vs kapasitas maksimal per kelas"
    >
      {!mounted ? (
        <EmptyState text="Memuat grafik kapasitas kelas." />
      ) : chartRows.length > 0 ? (
        <>
          <div className="grid gap-2.5 sm:hidden">
            {chartRows.map((row) => (
              <ProgressListRow
                key={row.name}
                label={row.name}
                value={row.label}
                percent={row.percent}
                color="#3b82f6"
                showAlert={row.percent > 85}
              />
            ))}
          </div>
          <div className="hidden h-[150px] w-full sm:block">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <BarChart
              data={chartRows}
              layout="vertical"
              barCategoryGap={8}
              margin={{ top: 0, right: 38, bottom: 0, left: 6 }}
            >
              <XAxis type="number" hide domain={[0, "dataMax"]} />
              <YAxis
                type="category"
                dataKey="name"
                width={98}
                tick={(props) => <ClassCapacityTick {...props} rows={chartRows} />}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<ClassCapacityTooltip />} />
              <Bar
                dataKey="studentsCount"
                stackId="capacity"
                fill="#3b82f6"
                radius={[4, 0, 0, 4]}
              />
              <Bar
                dataKey="remainingCapacity"
                stackId="capacity"
                fill="#f1f5f9"
                radius={[0, 4, 4, 0]}
              >
                <LabelList content={(props) => renderBarEndLabel(props, chartRows[Number(props.index)]?.label ?? "0/0")} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          </div>
        </>
      ) : (
        <EmptyState text="Belum ada data kapasitas kelas." />
      )}
    </DashboardCard>
  );
}

export function HafalanDonutChart({
  mounted,
  rows,
}: {
  mounted: boolean;
  rows: NonNullable<DashboardData["analytics"]>["hafalanProgress"];
}) {
  const order = ["mutqin", "lancar", "sedang_dihafal", "belum"];
  const labels: Record<string, string> = {
    mutqin: "Mutqin",
    lancar: "Lancar",
    sedang_dihafal: "Sedang",
    belum: "Belum",
  };
  const chartRows = order.map((status) => {
    const row = rows.find((item) => item.status === status);
    return {
      status,
      label: labels[status],
      total: row?.total ?? 0,
      pct: row?.pct ?? 0,
    };
  });
  const total = chartRows.reduce((sum, row) => sum + row.total, 0);
  const activeTotal = chartRows
    .filter((row) => row.status !== "belum")
    .reduce((sum, row) => sum + row.total, 0);
  const visibleSlices = chartRows.filter((row) => row.total > 0);

  return (
    <DashboardCard
      title="Progress Hafalan"
      subtitle="Distribusi status hafalan surah dari seluruh murid aktif"
    >
      {!mounted ? (
        <EmptyState text="Memuat grafik hafalan." />
      ) : total > 0 ? (
        <div className="grid gap-3">
          <div className="mx-auto h-[140px] w-[140px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <PieChart>
                <Pie
                  data={visibleSlices}
                  dataKey="total"
                  nameKey="label"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={1}
                  startAngle={90}
                  endAngle={-270}
                  isAnimationActive={false}
                  stroke="none"
                >
                  {visibleSlices.map((row) => (
                    <Cell key={row.status} fill={hafalanColors[row.status]} />
                  ))}
                </Pie>
                <text
                  x="50%"
                  y="48%"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-slate-900 text-sm font-semibold"
                >
                  {activeTotal}
                </text>
                <text
                  x="50%"
                  y="62%"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-[#64748b] text-[11px]"
                >
                  surah aktif
                </text>
                <Tooltip content={<HafalanTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-[#64748b]">
            {chartRows.map((row) => (
              <span key={row.status} className="inline-flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-[2px]"
                  style={{ backgroundColor: hafalanColors[row.status] }}
                />
                {row.label} ({row.pct}%)
              </span>
            ))}
          </div>
        </div>
      ) : (
        <EmptyState text="Belum ada data progress hafalan." />
      )}
    </DashboardCard>
  );
}

function ProgressListRow({
  label,
  value,
  percent,
  color,
  showAlert = false,
}: {
  label: string;
  value: string;
  percent: number;
  color: string;
  showAlert?: boolean;
}) {
  return (
    <div className="grid gap-1">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="inline-flex min-w-0 items-center gap-1.5 font-medium text-slate-800">
          {showAlert ? <span className="h-1.5 w-1.5 rounded-full bg-rose-500" /> : null}
          <span className="truncate">{label}</span>
        </span>
        <span className="shrink-0 font-semibold text-slate-700">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.min(Math.max(percent, 0), 100)}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function ChartTooltipFrame({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium text-slate-900">{title}</p>
      <div className="grid gap-0.5 text-[#64748b]">{children}</div>
    </div>
  );
}

function WeeklyAttendanceTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload as {
    weekNumber?: number;
    range?: string;
    hadir?: number;
    tidakHadir?: number;
    ratio?: number;
  };

  return (
    <ChartTooltipFrame
      title={`Minggu ${row.weekNumber ?? "-"} (${row.range ?? "-"})`}
    >
      <span>Hadir: {row.hadir ?? 0} murid</span>
      <span>Tidak hadir: {row.tidakHadir ?? 0} murid</span>
      <span>Rasio: {row.ratio ?? 0}%</span>
    </ChartTooltipFrame>
  );
}

function MontessoriTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload as {
    area?: string;
    mastered?: number;
    total?: number;
    masteredPct?: number;
  };

  return (
    <ChartTooltipFrame title={row.area ?? "Area Montessori"}>
      <span>
        {row.mastered ?? 0} dari {row.total ?? 0} milestone dikuasai (
        {Number(row.masteredPct ?? 0).toFixed(1)}%)
      </span>
    </ChartTooltipFrame>
  );
}

function ClassCapacityTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload as {
    name?: string;
    studentsCount?: number;
    capacity?: number;
    percent?: number;
  };

  return (
    <ChartTooltipFrame title={row.name ?? "Kelas"}>
      <span>
        {row.studentsCount ?? 0} murid dari kapasitas {row.capacity ?? 0} (
        {row.percent ?? 0}%)
      </span>
    </ChartTooltipFrame>
  );
}

function HafalanTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload as {
    label?: string;
    total?: number;
    pct?: number;
  };

  return (
    <ChartTooltipFrame title={row.label ?? "Status hafalan"}>
      <span>
        {row.total ?? 0} pencatatan ({row.pct ?? 0}%)
      </span>
    </ChartTooltipFrame>
  );
}

function WeeklyAxisTick({
  x,
  y,
  payload,
}: {
  x?: number;
  y?: number;
  payload?: { value?: string };
}) {
  const [week, date] = String(payload?.value ?? "").split("|");

  return (
    <g transform={`translate(${x ?? 0},${y ?? 0})`}>
      <text textAnchor="middle" fill="#64748b" fontSize={10}>
        <tspan x="0" dy="0">
          {week}
        </tspan>
        <tspan x="0" dy="12">
          {date}
        </tspan>
      </text>
    </g>
  );
}

function ClassCapacityTick({
  x,
  y,
  payload,
  rows,
}: {
  x?: number | string;
  y?: number | string;
  payload?: { value?: string; index?: number };
  rows: Array<{ name: string; percent: number }>;
}) {
  const row = rows[Number(payload?.index ?? -1)];
  const isFull = (row?.percent ?? 0) > 85;

  return (
    <g transform={`translate(${chartNumber(x)},${chartNumber(y)})`}>
      {isFull ? <circle cx="-7" cy="0" r="3" fill="#ef4444" /> : null}
      <text
        x="0"
        y="0"
        dy="0.32em"
        textAnchor="end"
        fill="#475569"
        fontSize={11}
      >
        {payload?.value}
      </text>
    </g>
  );
}

function renderBarEndLabel(
  props: {
    x?: number | string;
    y?: number | string;
    width?: number | string;
    height?: number | string;
  },
  value: string,
) {
  const x = chartNumber(props.x) + chartNumber(props.width) - 4;
  const y = chartNumber(props.y) + chartNumber(props.height) / 2 + 4;

  return (
    <text
      x={x}
      y={y}
      fill="#334155"
      fontSize={11}
      fontWeight={600}
      textAnchor="end"
    >
      {value}
    </text>
  );
}

function chartNumber(value?: number | string) {
  return typeof value === "number" ? value : Number(value ?? 0);
}

function parseDateOnly(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return new Date(value);
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function formatShortDayMonth(value?: string | null) {
  if (!value) return "-";
  const date = parseDateOnly(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
  }).format(date);
}
