"use client";

/* eslint-disable @typescript-eslint/no-unused-vars */

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, Eye, Pencil, Plus, Save, Wallet } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { CompactStatCard } from "@/components/finance/compact-stat-card";
import { usePermissions } from "@/lib/use-permissions";
import { Breadcrumbs, Button, Input, Modal, SearchBox, Select, Textarea, buildQuery, compactMoney, label, listFrom, money, monthName, todayInput, useList, type TeacherPayroll, type User } from "./phase-shared";

function PayrollStatusBadge({ status }: { status: TeacherPayroll["status"] }) {
  const cls = status === "paid"
    ? "border-emerald-600 bg-emerald-600 text-white"
    : status === "approved"
      ? "border-blue-200 bg-blue-50 text-blue-700"
      : status === "draft"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-slate-200 bg-slate-50 text-slate-700";

  return <span className={`inline-flex rounded-md border px-2 py-0.5 text-[10.5px] font-bold ${cls}`}>{label(status)}</span>;
}

export function TeacherPayrollsPage() {
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const [filters, setFilters] = useState({ month: String(new Date().getMonth() + 1), year: String(new Date().getFullYear()), status: "" });
  const [search, setSearch] = useState("");
  const allPayrolls = listFrom(useList<TeacherPayroll>(["teacher-payrolls", filters.month, filters.year], buildQuery("/finance/payrolls", { month: filters.month, year: filters.year, perPage: 100 })).data);
  const payrolls = allPayrolls.filter((item) => {
    const statusMatch = !filters.status || item.status === filters.status;
    const searchMatch = [item.teacher?.name ?? "", item.teacher?.email ?? ""].join(" ").toLowerCase().includes(search.toLowerCase());
    return statusMatch && searchMatch;
  });
  const teachers = listFrom(useList<User>(["payroll-teachers"], "/finance/payroll-teachers").data);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TeacherPayroll | null>(null);
  const [form, setForm] = useState({ teacherId: "", month: filters.month, year: filters.year, baseSalary: "", incentiveAmount: "0", deductionAmount: "0", status: "draft", paidAt: todayInput(), notes: "" });
  const total = allPayrolls.reduce((sum, item) => sum + item.totalAmount, 0);
  const paid = allPayrolls.filter((item) => item.status === "paid").reduce((sum, item) => sum + item.totalAmount, 0);
  const approved = allPayrolls.filter((item) => item.status === "approved").reduce((sum, item) => sum + item.totalAmount, 0);
  const draftCount = allPayrolls.filter((item) => item.status === "draft").length;
  const formTotal = Math.max(Number(form.baseSalary || 0) + Number(form.incentiveAmount || 0) - Number(form.deductionAmount || 0), 0);
  const statusTabs = [
    { value: "", label: "Semua" },
    { value: "draft", label: "Draft" },
    { value: "approved", label: "Disetujui" },
    { value: "paid", label: "Dibayar" },
  ];

  function openPayroll(item?: TeacherPayroll) {
    setEditing(item ?? null);
    setForm(item ? {
      teacherId: String(item.teacher?.id ?? item.teacherId ?? ""),
      month: String(item.month),
      year: String(item.year),
      baseSalary: String(item.baseSalary),
      incentiveAmount: String(item.incentiveAmount),
      deductionAmount: String(item.deductionAmount),
      status: item.status,
      paidAt: item.paidAt?.slice(0, 10) ?? todayInput(),
      notes: item.notes ?? "",
    } : { teacherId: "", month: filters.month, year: filters.year, baseSalary: "", incentiveAmount: "0", deductionAmount: "0", status: "draft", paidAt: todayInput(), notes: "" });
    setFormOpen(true);
  }

  const savePayroll = useMutation({
    mutationFn: () => apiFetch(editing ? `/finance/payrolls/${editing.id}` : "/finance/payrolls", {
      method: editing ? "PUT" : "POST",
      body: {
        teacherId: Number(form.teacherId),
        month: Number(form.month),
        year: Number(form.year),
        baseSalary: Number(form.baseSalary),
        incentiveAmount: Number(form.incentiveAmount),
        deductionAmount: Number(form.deductionAmount),
        status: form.status,
        paidAt: form.status === "paid" ? form.paidAt : undefined,
        notes: form.notes,
      },
    }),
    onSuccess: () => {
      toast.success("Gaji guru tersimpan");
      setFormOpen(false);
      queryClient.invalidateQueries({ queryKey: ["teacher-payrolls"] });
      queryClient.invalidateQueries({ queryKey: ["finance-overview"] });
    },
    onError: (error) => toast.error(error.message),
  });
  const changeStatus = useMutation({
    mutationFn: ({ item, status }: { item: TeacherPayroll; status: TeacherPayroll["status"] }) => apiFetch(`/finance/payrolls/${item.id}`, {
      method: "PUT",
      body: {
        teacherId: item.teacher?.id ?? item.teacherId,
        month: item.month,
        year: item.year,
        baseSalary: item.baseSalary,
        incentiveAmount: item.incentiveAmount,
        deductionAmount: item.deductionAmount,
        status,
        paidAt: status === "paid" ? todayInput() : undefined,
        notes: item.notes ?? "",
      },
    }),
    onSuccess: () => {
      toast.success("Status gaji diperbarui");
      queryClient.invalidateQueries({ queryKey: ["teacher-payrolls"] });
      queryClient.invalidateQueries({ queryKey: ["finance-overview"] });
    },
    onError: (error) => toast.error(error.message),
  });

  function exportPayrollCsv() {
    const rows = [
      ["Guru", "Bulan", "Gaji Pokok", "Insentif", "Potongan", "Total", "Status"],
      ...payrolls.map((item) => [
        item.teacher?.name ?? "",
        monthName(item.month, item.year),
        String(item.baseSalary),
        String(item.incentiveAmount),
        String(item.deductionAmount),
        String(item.totalAmount),
        label(item.status),
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll("\"", "\"\"")}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `gaji-guru-${filters.month}-${filters.year}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="grid gap-4">
      <Breadcrumbs items={[{ label: "Keuangan", href: "/finance" }, { label: "Gaji Guru" }]} />
      <section className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 xl:flex-row xl:items-center xl:justify-between">
        <h1 className="font-display text-xl font-extrabold text-[#0a1f5c]">Gaji Guru</h1>
        <div className="flex items-center gap-2">
          <div className="group relative">
            <button type="button" className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white text-sm font-extrabold text-[#0a1f5c]" aria-label="Alur gaji">i</button>
            <div className="invisible absolute right-0 top-10 z-20 w-72 rounded-lg border border-slate-200 bg-white p-3 text-xs leading-5 text-[#334155] opacity-0 shadow-lg transition group-hover:visible group-hover:opacity-100">
              1. Draft {"->"} catat nominal gaji<br />
              2. Disetujui {"->"} angka sudah dicek, siap dibayar<br />
              3. Dibayar {"->"} isi tanggal bayar, masuk laporan kas
            </div>
          </div>
          {can("manage_fees") ? <Button onClick={() => openPayroll()}><Plus className="h-4 w-4" />Catat Gaji Guru</Button> : null}
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-1">
          {statusTabs.map((tab) => (
            <button key={tab.value} type="button" onClick={() => setFilters({ ...filters, status: tab.value })} className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${filters.status === tab.value ? "bg-[#0a1f5c] text-white" : "text-[#0a1f5c] hover:bg-slate-50"}`}>
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <SearchBox value={search} onChange={setSearch} placeholder="Cari nama guru..." />
          <Button tone="plain" onClick={exportPayrollCsv}><Download className="h-4 w-4" />Export</Button>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <CompactStatCard label="Harus Dibayar" value={compactMoney(total)} description="Semua status" borderColor="rose" />
        <CompactStatCard label="Siap Dibayar" value={compactMoney(approved)} description="Status disetujui" borderColor="blue" />
        <CompactStatCard label="Sudah Dibayar" value={compactMoney(paid)} description="Masuk kas keluar" borderColor="emerald" />
        <CompactStatCard label="Masih Draft" value={`${draftCount} data`} description="Belum disetujui" borderColor="amber" />
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="flex min-h-11 items-center justify-between gap-2 border-b border-slate-100 px-4 py-2.5">
          <h2 className="text-[13px] font-bold text-[#0a1f5c]">Tabel Daftar Gaji</h2>
          <span className="text-xs font-semibold text-[#64748b]">{payrolls.length} data</span>
        </div>
        {payrolls.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-[#64748b]">
                <tr>
                  <th className="px-4 py-3">Guru</th>
                  <th className="px-4 py-3">Bulan</th>
                  <th className="px-4 py-3 text-right">Gaji Pokok</th>
                  <th className="px-4 py-3 text-right">Insentif</th>
                  <th className="px-4 py-3 text-right">Potongan</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {payrolls.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100 transition hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-semibold text-[#0a1f5c]">{item.teacher?.name ?? "Guru"}</td>
                    <td className="px-4 py-3 text-[#64748b]">{monthName(item.month, item.year)}</td>
                    <td className="px-4 py-3 text-right font-mono text-sm">{money(item.baseSalary)}</td>
                    <td className="px-4 py-3 text-right font-mono text-sm">{money(item.incentiveAmount)}</td>
                    <td className="px-4 py-3 text-right font-mono text-sm">{money(item.deductionAmount)}</td>
                    <td className="px-4 py-3 text-right font-mono text-sm font-bold text-[#0a1f5c]">{money(item.totalAmount)}</td>
                    <td className="px-4 py-3"><PayrollStatusBadge status={item.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button tone="plain" onClick={() => openPayroll(item)}><Eye className="h-4 w-4" />Detail</Button>
                        {can("manage_fees") && item.status === "draft" ? <Button tone="plain" onClick={() => openPayroll(item)}><Pencil className="h-4 w-4" />Edit</Button> : null}
                        {can("manage_fees") && item.status === "draft" ? <Button onClick={() => changeStatus.mutate({ item, status: "approved" })}>Setujui</Button> : null}
                        {can("manage_fees") && item.status === "approved" ? <Button onClick={() => changeStatus.mutate({ item, status: "paid" })}>Dibayar</Button> : null}
                        {can("manage_fees") && item.status === "approved" ? <Button tone="plain" onClick={() => changeStatus.mutate({ item, status: "draft" })}>Batalkan</Button> : null}
                        {item.status === "paid" ? <Button tone="plain" onClick={() => toast.info("Slip gaji belum tersedia")}><Download className="h-4 w-4" />Slip</Button> : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid place-items-center px-4 py-12 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-slate-100 text-[#64748b]"><Wallet className="h-6 w-6" /></div>
            <h3 className="mt-3 font-bold text-[#0a1f5c]">Belum ada data gaji {monthName(Number(filters.month), Number(filters.year))}</h3>
            <p className="mt-1 text-sm text-[#64748b]">Mulai catat gaji guru untuk periode ini.</p>
            {can("manage_fees") ? <div className="mt-4"><Button onClick={() => openPayroll()}><Plus className="h-4 w-4" />Catat Gaji Guru</Button></div> : null}
          </div>
        )}
      </section>

      <Modal open={formOpen} title={editing ? "Edit gaji guru" : "Catat gaji guru"} description="Total dibayar = gaji pokok + insentif - potongan. Pilih status dibayar hanya jika uang sudah keluar." onClose={() => setFormOpen(false)}>
        <form className="grid gap-3" onSubmit={(event) => { event.preventDefault(); savePayroll.mutate(); }}>
          <Select label="Guru" value={form.teacherId} onChange={(value) => setForm({ ...form, teacherId: value })} required>
            <option value="">Pilih guru</option>
            {teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}
          </Select>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Bulan" type="number" value={form.month} onChange={(value) => setForm({ ...form, month: value })} required />
            <Input label="Tahun" type="number" value={form.year} onChange={(value) => setForm({ ...form, year: value })} required />
          </div>
          <Input label="Gaji pokok" type="number" value={form.baseSalary} onChange={(value) => setForm({ ...form, baseSalary: value })} required />
          <Input label="Tambahan / insentif" type="number" value={form.incentiveAmount} onChange={(value) => setForm({ ...form, incentiveAmount: value })} />
          <Input label="Potongan" type="number" value={form.deductionAmount} onChange={(value) => setForm({ ...form, deductionAmount: value })} />
          <div className="rounded-lg border border-[#0a1f5c]/15 bg-slate-50 p-3">
            <p className="text-xs font-semibold text-[#64748b]">Total yang akan dicatat</p>
            <p className="font-display mt-1 text-2xl font-extrabold text-[#0a1f5c]">{money(formTotal)}</p>
          </div>
          <Select label="Status" value={form.status} onChange={(value) => setForm({ ...form, status: value })}>
            <option value="draft">Draft - masih disusun</option>
            <option value="approved">Disetujui - siap dibayar</option>
            <option value="paid">Dibayar - uang sudah keluar</option>
            <option value="cancelled">Batal</option>
          </Select>
          {form.status === "paid" ? <Input label="Tanggal bayar" type="date" value={form.paidAt} onChange={(value) => setForm({ ...form, paidAt: value })} /> : null}
          <Textarea label="Catatan" value={form.notes} onChange={(value) => setForm({ ...form, notes: value })} rows={3} />
          <Button type="submit" disabled={savePayroll.isPending}><Save className="h-4 w-4" />Simpan</Button>
        </form>
      </Modal>
    </div>
  );
}
