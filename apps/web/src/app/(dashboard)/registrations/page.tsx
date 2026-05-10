"use client";

import dynamic from "next/dynamic";

const RegistrationsWorkspace = dynamic(
  () => import("@/components/workspace-pages").then((mod) => mod.RegistrationsPage),
  { ssr: false, loading: () => <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm font-semibold text-[#64748b]">Memuat PPDB.</div> },
);

export default function RegistrationsPage() {
  return <RegistrationsWorkspace />;
}
