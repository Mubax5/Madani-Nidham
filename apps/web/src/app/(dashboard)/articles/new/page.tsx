"use client";

import dynamic from "next/dynamic";

const Workspace = dynamic(
  () => import("@/components/phase2-pages").then((mod) => mod.ArticleNewPage),
  { ssr: false, loading: () => <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm font-semibold text-[#64748b]">Memuat artikel baru.</div> },
);

export default function ArticleNewPage() {
  return <Workspace />;
}
