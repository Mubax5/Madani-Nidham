"use client";

import dynamic from "next/dynamic";

const AgendasWorkspace = dynamic(
  () => import("@/components/workspace-pages").then((mod) => mod.AgendasPage),
  { ssr: false, loading: () => <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm font-semibold text-[#64748b]">Memuat agenda.</div> },
);

export default function AgendasPage() {
  return <AgendasWorkspace />;
}
