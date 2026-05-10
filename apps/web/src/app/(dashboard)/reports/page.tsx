"use client";

import dynamic from "next/dynamic";

const ReportsWorkspace = dynamic(
  () => import("@/components/workspace-pages").then((mod) => mod.ReportsPage),
  { ssr: false, loading: () => <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm font-semibold text-[#64748b]">Memuat laporan.</div> },
);

export default function ReportsPage() {
  return <ReportsWorkspace />;
}
