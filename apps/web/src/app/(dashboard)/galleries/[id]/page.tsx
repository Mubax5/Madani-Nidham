"use client";

import dynamic from "next/dynamic";

const Workspace = dynamic(
  () => import("@/components/phase2-pages").then((mod) => mod.GalleryDetailPage),
  { ssr: false, loading: () => <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm font-semibold text-[#64748b]">Memuat detail galeri.</div> },
);

export default function GalleryDetailPage({ params }: { params: { id: string } }) {
  return <Workspace id={Number(params.id)} />;
}
