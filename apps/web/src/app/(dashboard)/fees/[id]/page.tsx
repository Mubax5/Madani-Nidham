import { FeeDetailPage as FeeDetailWorkspace } from "@/components/fast-pages/fees-page";

export default async function FeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <FeeDetailWorkspace id={Number(id)} />;
}
