"use client";

import dynamic from "next/dynamic";

const AnnouncementsWorkspace = dynamic(
  () => import("@/components/workspace-pages").then((mod) => mod.AnnouncementsPage),
  { ssr: false, loading: () => <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm font-semibold text-[#64748b]">Memuat pengumuman.</div> },
);

export default function AnnouncementsPage() {
  return <AnnouncementsWorkspace />;
}
