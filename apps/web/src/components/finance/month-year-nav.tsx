"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

const bulanId = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

type MonthYearNavProps = {
  month: number;
  year: number;
  onChange: (month: number, year: number) => void;
};

export function MonthYearNav({ month, year, onChange }: MonthYearNavProps) {
  function move(delta: number) {
    const date = new Date(year, month - 1 + delta, 1);
    onChange(date.getMonth() + 1, date.getFullYear());
  }

  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
      <button
        type="button"
        onClick={() => move(-1)}
        className="grid h-8 w-8 place-items-center rounded-md text-[#64748b] transition hover:bg-slate-50 hover:text-[#0a1f5c]"
        aria-label="Bulan sebelumnya"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <div className="min-w-[128px] text-center text-sm font-semibold text-[#0a1f5c]">
        {bulanId[month - 1] ?? "-"} {year}
      </div>
      <button
        type="button"
        onClick={() => move(1)}
        className="grid h-8 w-8 place-items-center rounded-md text-[#64748b] transition hover:bg-slate-50 hover:text-[#0a1f5c]"
        aria-label="Bulan berikutnya"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
