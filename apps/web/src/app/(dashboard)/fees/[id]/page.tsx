"use client";

import { FeeDetailPage as FeeDetailWorkspace } from "@/components/fast-pages/fees-page";

export default function FeeDetailPage({ params }: { params: { id: string } }) {
  return <FeeDetailWorkspace id={Number(params.id)} />;
}
