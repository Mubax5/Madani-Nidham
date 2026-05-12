import { GalleryDetailPage as Workspace } from "@/components/phase2-pages";

export default async function GalleryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <Workspace id={Number(id)} />;
}
