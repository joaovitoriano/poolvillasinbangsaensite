import { AdminVillaEditor } from "@/components/admin/AdminVillaEditor";

export default async function EditVillaPage({ params }: { params: Promise<{ villaId: string }> }) {
  const { villaId } = await params;
  return <AdminVillaEditor villaId={villaId} />;
}
