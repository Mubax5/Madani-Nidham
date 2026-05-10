"use client";

import dynamic from "next/dynamic";

const MilestonesWorkspace = dynamic(
  () => import("@/components/workspace-pages").then((mod) => mod.MilestonesPage),
  { ssr: false, loading: () => <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm font-semibold text-[#64748b]">Memuat montessori.</div> },
);

export default function MilestonesPage() {
  return <MilestonesWorkspace />;
}
