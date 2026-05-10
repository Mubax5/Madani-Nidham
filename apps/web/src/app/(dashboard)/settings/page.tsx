"use client";

import dynamic from "next/dynamic";

const SettingsWorkspace = dynamic(
  () => import("@/components/workspace-pages").then((mod) => mod.SettingsPage),
  { ssr: false, loading: () => <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm font-semibold text-[#64748b]">Memuat pengaturan.</div> },
);

export default function SettingsPage() {
  return <SettingsWorkspace />;
}
