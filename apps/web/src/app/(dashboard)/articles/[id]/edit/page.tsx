import { ArticleEditPage as Workspace } from "@/components/phase2-pages";

export default async function ArticleEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <Workspace id={Number(id)} />;
}
