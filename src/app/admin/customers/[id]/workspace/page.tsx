import { UserRole } from "@prisma/client";
import { Shell } from "@/components/layout";
import { requireRole } from "@/lib/auth";
import { CustomerWorkspaceView } from "@/components/customer-workspace-view";
import { getCustomerWorkspaceData } from "@/services/customer-workspace-service";

export default async function AdminCustomerWorkspacePreviewPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireRole([UserRole.ADMIN]);
  const { id } = await params;
  const data = await getCustomerWorkspaceData(id);

  return (
    <Shell session={session}>
      <CustomerWorkspaceView
        data={data}
        mode="admin-preview"
        statementHref={`/admin/statements?customerId=${id}`}
      />
    </Shell>
  );
}
