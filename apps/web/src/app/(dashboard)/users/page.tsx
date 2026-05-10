"use client";

import dynamic from "next/dynamic";

const UsersWorkspace = dynamic(
  () => import("@/components/workspace-pages").then((mod) => mod.UsersPage),
  { ssr: false, loading: () => <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm font-semibold text-[#64748b]">Memuat admin user.</div> },
);

export default function UsersPage() {
  return <UsersWorkspace />;
}
