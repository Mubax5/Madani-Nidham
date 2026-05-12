import { HafalanStudentPage as Workspace } from "@/components/phase2-pages";

export default async function HafalanStudentPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;

  return <Workspace studentId={Number(studentId)} />;
}
