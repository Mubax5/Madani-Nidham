"use client";

/* eslint-disable @typescript-eslint/no-unused-vars */

import { useState } from "react";
import dynamic from "next/dynamic";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Save } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { CompactStatCard } from "@/components/finance/compact-stat-card";
import { usePermissions } from "@/lib/use-permissions";
import { Button, Empty, Input, Modal, Panel, Select, Textarea, compactMoney, money, todayInput, useItem, type FinanceEntry, type FinanceOverview } from "./phase-shared";
import { FinanceAuditList } from "./finance-audit-list";

type CompositionRow = { name: string; value: number; color: string };

const CashFlowChart = dynamic(() => import("./finance-charts").then((mod) => mod.CashFlowChart), { ssr: false, loading: () => <ChartLoading /> });
const CashCompositionChart = dynamic(() => import("./finance-charts").then((mod) => mod.CashCompositionChart), { ssr: false, loading: () => <ChartLoading /> });

function ChartLoading() {
  return <div className="grid h-full min-h-[130px] place-items-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-xs font-semibold text-[#64748b]">Memuat grafik.</div>;
}

function CashCompositionCompact({ rows, total }: { rows: CompositionRow[]; total: number }) {
  if (rows.length === 0) {
    return <Empty text="Belum ada kas masuk periode ini." />;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-[132px_1fr] sm:items-center">
      <div className="h-[132px]">
        <CashCompositionChart rows={rows} compact />
      </div>
      <div className="grid gap-2">
        {rows.map((item) => {
          const percent = total ? Math.round((item.value / total) * 100) : 0;
          return (
            <div key={item.name} className="grid gap-1 rounded-lg border border-slate-100 px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-xs font-semibold text-[#0a1f5c]"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />{item.name}</span>
                <span className="text-right text-xs font-bold text-[#0a1f5c]">{money(item.value)} <span className="text-[#64748b]">({percent}%)</span></span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: item.color }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HealthRow({ icon, label, value, status }: { icon: string; label: string; value: string; status: "Baik" | "Perhatian" | "Kritis" }) {
  const statusClass = status === "Baik"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : status === "Perhatian"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : "border-rose-200 bg-rose-50 text-rose-700";

  return (
    <div className="grid grid-cols-[24px_1fr_auto_auto] items-center gap-2 rounded-lg border border-slate-100 px-2.5 py-1.5">
      <span className="grid h-6 w-6 place-items-center rounded-md bg-slate-50 text-[11px] font-extrabold text-[#0a1f5c]">{icon}</span>
      <span className="text-xs font-semibold text-[#0a1f5c]">{label}</span>
      <span className="text-xs font-bold text-[#0a1f5c]">{value}</span>
      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusClass}`}>{status}</span>
    </div>
  );
}

export function FinanceOverviewPage() {
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const [flowRange, setFlowRange] = useState<"threeMonths" | "oneMonth" | "sevenDays" | "oneDay">("oneMonth");
  const overview = useItem<FinanceOverview>(["finance-overview"], "/finance/overview").data?.data;
  const [entryOpen, setEntryOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<FinanceEntry | null>(null);
  const [entryForm, setEntryForm] = useState({ type: "expense", category: "operational", title: "", amount: "", entryDate: todayInput(), source: "", notes: "" });
  const categoryRows = overview?.categories ?? [];
  const flowTabs = [
    { key: "oneDay", label: "Hari ini" },
    { key: "sevenDays", label: "7 hari" },
    { key: "oneMonth", label: "1 bulan" },
    { key: "threeMonths", label: "3 bulan" },
  ] as const;
  const cashFlowRows = overview?.cashFlow?.[flowRange] ?? [];
  const incomeCompletion = (overview?.targetIncome ?? 0) > 0 ? Math.round(((overview?.cashIn ?? 0) / (overview?.targetIncome ?? 1)) * 100) : 0;
  const expensePressure = (overview?.cashIn ?? 0) > 0 ? Math.round(((overview?.cashOut ?? 0) / (overview?.cashIn ?? 1)) * 100) : 0;
  const flowIn = cashFlowRows.reduce((sum, item) => sum + item.cashIn, 0);
  const flowOut = cashFlowRows.reduce((sum, item) => sum + item.cashOut, 0);
  const flowNet = flowIn - flowOut;
  const compositionColors = ["#2563eb", "#10b981", "#f97316", "#ef4444", "#7c3aed", "#0f766e", "#f59e0b"];
  const compositionRows = categoryRows
    .filter((item) => Math.abs(item.paid) > 0)
    .map((item, index) => ({
      name: item.type === "expense" && !item.label.toLowerCase().includes("keluar") ? `${item.label} Keluar` : item.label,
      value: Math.abs(item.paid),
      color: item.type === "expense" ? "#ef4444" : compositionColors[index % compositionColors.length],
    }));
  const compositionTotal = compositionRows.reduce((sum, item) => sum + item.value, 0);
  const spp = categoryRows.find((item) => item.key === "spp");
  const sppRatio = (spp?.target ?? 0) > 0 ? Math.round(((spp?.paid ?? 0) / (spp?.target ?? 1)) * 100) : 0;
  const runwayMonths = (overview?.plannedExpense ?? 0) > 0 ? Math.floor((overview?.netCash ?? 0) / (overview?.plannedExpense ?? 1)) : null;

  function openEntry(item?: FinanceEntry) {
    setEditingEntry(item ?? null);
    setEntryForm(item ? {
      type: item.type,
      category: item.category,
      title: item.title,
      amount: String(item.amount),
      entryDate: item.entryDate?.slice(0, 10) ?? todayInput(),
      source: item.source ?? "",
      notes: item.notes ?? "",
    } : { type: "expense", category: "operational", title: "", amount: "", entryDate: todayInput(), source: "", notes: "" });
    setEntryOpen(true);
  }

  const saveEntry = useMutation({
    mutationFn: () => apiFetch(editingEntry ? `/finance/entries/${editingEntry.id}` : "/finance/entries", {
      method: editingEntry ? "PUT" : "POST",
      body: { ...entryForm, amount: Number(entryForm.amount) },
    }),
    onSuccess: () => {
      toast.success("Catatan kas tersimpan");
      setEntryOpen(false);
      queryClient.invalidateQueries({ queryKey: ["finance-overview"] });
      queryClient.invalidateQueries({ queryKey: ["finance-audit"] });
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <div className="grid gap-4">
      <section className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 lg:flex-row lg:items-center lg:justify-between">
        <h1 className="font-display text-xl font-extrabold text-[#0a1f5c]">Pusat Keuangan</h1>
        {can("manage_fees") ? <Button onClick={() => openEntry()}><Plus className="h-4 w-4" />Catatan Kas</Button> : <span />}
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <CompactStatCard label="Saldo" value={compactMoney(overview?.netCash)} description={(overview?.netCash ?? 0) >= 0 ? "Kas positif" : "Kas minus"} borderColor="blue" />
        <CompactStatCard label="Uang Keluar" value={compactMoney(overview?.cashOut)} description={`${expensePressure}% dari masuk`} borderColor="rose" />
        <CompactStatCard label="Uang Masuk" value={compactMoney(overview?.cashIn)} description={`${incomeCompletion}% dari target`} borderColor="emerald" trend={{ value: `Target ${compactMoney(overview?.targetIncome)}`, positive: true }} />
        <CompactStatCard label="Belum Tertagih" value={compactMoney(overview?.outstandingIncome)} description="SPP + pendaftaran" borderColor="amber" />
      </section>

      <Panel
        title="Grafik Arus Kas"
        action={<div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">{flowTabs.map((tab) => <button key={tab.key} type="button" onClick={() => setFlowRange(tab.key)} className={`h-8 rounded-md px-3 text-xs font-bold transition ${flowRange === tab.key ? "bg-[#0a1f5c] text-white" : "text-[#0a1f5c] hover:bg-slate-50"}`}>{tab.label}</button>)}</div>}
      >
        <p className="mb-3 text-sm font-semibold text-[#64748b]">
          Masuk <span className="text-emerald-700">{money(flowIn)}</span> <span className="mx-1 text-slate-300">|</span>
          Keluar <span className="text-rose-700">{money(flowOut)}</span> <span className="mx-1 text-slate-300">|</span>
          Net <span className={flowNet >= 0 ? "text-emerald-700" : "text-rose-700"}>{flowNet >= 0 ? "+" : ""}{money(flowNet)}</span>
        </p>
        <div className="h-[220px]">
          <CashFlowChart rows={cashFlowRows} range={flowRange} />
        </div>
      </Panel>

      <section className="grid items-start gap-3 lg:grid-cols-[0.85fr_1.15fr]">
        <Panel title="Komposisi kas">
          <CashCompositionCompact rows={compositionRows} total={compositionTotal} />
        </Panel>
        <Panel title="Kesehatan kas bulan ini">
          <div className="grid gap-2">
            <HealthRow icon="%" label="Rasio koleksi SPP" value={`${sppRatio}%`} status={sppRatio >= 80 ? "Baik" : sppRatio >= 50 ? "Perhatian" : "Kritis"} />
            <HealthRow icon="!" label="Total tunggakan" value={money(overview?.outstandingIncome)} status={(overview?.outstandingIncome ?? 0) <= 0 ? "Baik" : "Perhatian"} />
            <HealthRow icon="R" label="Runway kas" value={runwayMonths === null ? "Belum ada beban tetap" : `${runwayMonths} bulan`} status={runwayMonths === null || runwayMonths >= 3 ? "Baik" : runwayMonths >= 1 ? "Perhatian" : "Kritis"} />
            <HealthRow icon="+" label="Target masuk" value={money(overview?.targetIncome)} status={incomeCompletion >= 80 ? "Baik" : "Perhatian"} />
            <HealthRow icon="-" label="Rencana keluar" value={money(overview?.plannedExpense)} status={(overview?.plannedExpense ?? 0) <= (overview?.cashIn ?? 0) ? "Baik" : "Perhatian"} />
          </div>
        </Panel>
      </section>

      <Modal open={entryOpen} title={editingEntry ? "Edit catatan kas" : "Catatan kas baru"} description="Pakai untuk operasional, donasi, aset, maintenance, atau transaksi lain di luar SPP/pendaftaran." onClose={() => setEntryOpen(false)}>
        <form className="grid gap-3" onSubmit={(event) => { event.preventDefault(); saveEntry.mutate(); }}>
          <Select label="Tipe" value={entryForm.type} onChange={(value) => setEntryForm({ ...entryForm, type: value })}>
            <option value="income">Pemasukan</option>
            <option value="expense">Pengeluaran</option>
          </Select>
          <Select label="Kategori" value={entryForm.category} onChange={(value) => setEntryForm({ ...entryForm, category: value })}>
            <option value="operational">Operasional</option>
            <option value="donation">Donasi</option>
            <option value="asset">Aset</option>
            <option value="maintenance">Maintenance</option>
            <option value="other">Lainnya</option>
          </Select>
          <Input label="Judul" value={entryForm.title} onChange={(value) => setEntryForm({ ...entryForm, title: value })} required />
          <Input label="Nominal" type="number" value={entryForm.amount} onChange={(value) => setEntryForm({ ...entryForm, amount: value })} required />
          <Input label="Tanggal" type="date" max={todayInput()} value={entryForm.entryDate} onChange={(value) => setEntryForm({ ...entryForm, entryDate: value })} required />
          <Input label="Sumber/vendor" value={entryForm.source} onChange={(value) => setEntryForm({ ...entryForm, source: value })} />
          <Textarea label="Catatan" value={entryForm.notes} onChange={(value) => setEntryForm({ ...entryForm, notes: value })} rows={3} />
          <Button type="submit" disabled={saveEntry.isPending}><Save className="h-4 w-4" />Simpan</Button>
        </form>
      </Modal>

      <FinanceAuditList />
    </div>
  );
}
