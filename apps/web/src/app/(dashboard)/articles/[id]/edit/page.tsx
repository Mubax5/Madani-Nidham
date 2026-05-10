"use client";

import dynamic from "next/dynamic";

const Workspace = dynamic(
  () => import("@/components/phase2-pages").then((mod) => mod.ArticleEditPage),
  { ssr: false, loading: () => <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm font-semibold text-[#64748b]">Memuat edit artikel.</div> },
);

export default function ArticleEditPage({ params }: { params: { id: string } }) {
  return <Workspace id={Number(params.id)} />;
}
