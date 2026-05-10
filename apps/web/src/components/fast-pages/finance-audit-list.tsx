"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Search } from "lucide-react";
import { MonthYearNav } from "@/components/finance/month-year-nav";
import { Badge, Panel, buildQuery, formatDate, label, money, useItem } from "./phase-shared";

type FinanceAuditRow = {
  id: string;
  kind: string;
  type: "income" | "expense";
  category: string;
  title: string;
  amount: number;
  date?: string | null;
  source?: string | null;
  actor?: string | null;
  updatedAt?: string | null;
};

type FinanceAuditPayload = {
  range: { startDate: string; endDate: string };
  summary: { cashIn: number; cashOut: number; count: number };
  rows: FinanceAuditRow[];
};

export function FinanceAuditList({ monthly = false }: { monthly?: boolean }) {
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear() });
  const endpoint = monthly
    ? buildQuery("/finance/audit", { month: period.month, year: period.year, search })
    : buildQuery("/finance/audit", { range: "oneMonth", search });
  const audit = useItem<FinanceAuditPayload>(
    ["finance-audit", monthly ? period : "oneMonth", search],
    endpoint,
  ).data?.data;
  const rows = audit?.rows ?? [];
  const net = (audit?.summary.cashIn ?? 0) - (audit?.summary.cashOut ?? 0);

  return (
    <Panel
      title={monthly ? "Audit keuangan per bulan" : "Audit uang masuk dan keluar"}
      action={
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          {monthly ? (
            <MonthYearNav month={period.month} year={period.year} onChange={(month, year) => setPeriod({ month, year })} />
          ) : null}
          <label className="relative block min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748b]" />
            <input
              className="madani-input w-full"
              style={{ paddingLeft: 38 }}
              value={search}
              placeholder="Cari transaksi, sumber, admin"
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          {!monthly ? (
            <Link href="/finance/audit" className="madani-button justify-center border border-slate-200 bg-white text-[#0a1f5c]">
              Audit bulanan
            </Link>
          ) : null}
        </div>
      }
    >
      {monthly ? <div className="mb-3 grid gap-2 sm:grid-cols-3">
        <AuditMetric label="Masuk" value={money(audit?.summary.cashIn)} tone="income" />
        <AuditMetric label="Keluar" value={money(audit?.summary.cashOut)} tone="expense" />
        <AuditMetric label="Net" value={`${net >= 0 ? "+" : ""}${money(net)}`} tone={net >= 0 ? "income" : "expense"} />
      </div> : null}
      <div className="overflow-hidden rounded-lg border border-slate-200">
        <div className="max-h-[420px] overflow-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="sticky top-0 bg-slate-50 text-[11px] uppercase text-[#64748b]">
              <tr>
                <th className="p-2.5">Tanggal</th>
                <th className="p-2.5">Transaksi</th>
                <th className="p-2.5">Tipe</th>
                <th className="p-2.5 text-right">Nominal</th>
                <th className="p-2.5">Sumber</th>
                <th className="p-2.5">Diubah</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="p-2.5 text-xs text-[#64748b]">{formatDate(row.date)}</td>
                  <td className="p-2.5">
                    <p className="font-bold text-[#0a1f5c]">{row.title}</p>
                    <p className="text-xs text-[#64748b]">{label(row.category)} / {row.actor ?? "Sistem"}</p>
                  </td>
                  <td className="p-2.5"><Badge value={row.type} /></td>
                  <td className={`p-2.5 text-right font-mono text-sm font-bold ${row.type === "income" ? "text-emerald-700" : "text-rose-700"}`}>
                    {row.type === "income" ? "+" : "-"}{money(row.amount)}
                  </td>
                  <td className="p-2.5 text-xs text-[#64748b]">{row.source ?? "-"}</td>
                  <td className="p-2.5 text-xs text-[#64748b]">{formatDate(row.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 ? <div className="p-3 text-xs font-semibold text-[#64748b]">Belum ada audit sesuai filter.</div> : null}
      </div>
    </Panel>
  );
}

export function FinanceAuditPage() {
  return (
    <div className="grid gap-4">
      <section className="rounded-lg border border-slate-200 bg-white p-3">
        <Link href="/finance" className="inline-flex items-center gap-1 text-xs font-bold text-[#0a1f5c] hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" />
          Kembali ke pusat keuangan
        </Link>
        <h1 className="font-display mt-2 text-xl font-extrabold text-[#0a1f5c]">Audit Keuangan Bulanan</h1>
        <p className="mt-1 text-xs font-semibold text-[#64748b]">Semua uang masuk dan keluar per bulan, bisa dicari dari satu tempat.</p>
      </section>
      <FinanceAuditList monthly />
    </div>
  );
}

function AuditMetric({ label: metricLabel, value, tone }: { label: string; value: string; tone: "income" | "expense" }) {
  return (
    <div className={`rounded-lg border px-3 py-2 ${tone === "income" ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}`}>
      <p className="text-[11px] font-bold uppercase text-[#64748b]">{metricLabel}</p>
      <p className={`font-display mt-0.5 text-lg font-extrabold ${tone === "income" ? "text-emerald-700" : "text-rose-700"}`}>{value}</p>
    </div>
  );
}
