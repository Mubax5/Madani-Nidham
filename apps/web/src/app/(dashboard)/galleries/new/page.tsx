"use client";

import dynamic from "next/dynamic";

const Workspace = dynamic(
  () => import("@/components/phase2-pages").then((mod) => mod.GalleryNewPage),
  { ssr: false, loading: () => <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm font-semibold text-[#64748b]">Memuat galeri baru.</div> },
);

export default function GalleryNewPage() {
  return <Workspace />;
}
