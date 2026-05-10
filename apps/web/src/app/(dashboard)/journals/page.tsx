"use client";

import dynamic from "next/dynamic";

const JournalsWorkspace = dynamic(
  () => import("@/components/workspace-pages").then((mod) => mod.JournalsPage),
  { ssr: false, loading: () => <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm font-semibold text-[#64748b]">Memuat jurnal.</div> },
);

export default function JournalsPage() {
  return <JournalsWorkspace />;
}
