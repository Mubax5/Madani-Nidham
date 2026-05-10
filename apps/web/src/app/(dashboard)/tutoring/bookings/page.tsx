"use client";

import dynamic from "next/dynamic";

const Workspace = dynamic(
  () => import("@/components/phase2-pages").then((mod) => mod.TutoringBookingsPage),
  { ssr: false, loading: () => <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm font-semibold text-[#64748b]">Memuat booking bimbel.</div> },
);

export default function TutoringBookingsPage() {
  return <Workspace />;
}
