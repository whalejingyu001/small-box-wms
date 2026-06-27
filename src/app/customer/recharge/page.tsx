import { UserRole } from "@prisma/client";
import { Shell } from "@/components/layout";
import { requireRole } from "@/lib/auth";
import { CustomerRechargePanel } from "@/components/customer-recharge-panel";
import { createRechargeRequestAction } from "@/server/actions";
import { getCustomerWorkspaceData } from "@/services/customer-workspace-service";

export default async function CustomerRechargePage() {
  const session = await requireRole([UserRole.CUSTOMER]);
  const data = await getCustomerWorkspaceData(session.customerId!);

  return (
    <Shell session={session}>
      <div className="page-stack">
        <section className="card soft admin-overview-hero">
          <div className="section-head">
            <div>
              <span className="pill">充值申请</span>
              <h2>提交充值</h2>
              <p className="muted">客户端单独保留一个充值页，填写更直接，也更不容易和预报操作混在一起。</p>
            </div>
            <div className="admin-overview-side">
              <div className="admin-overview-side-label">申请状态</div>
              <strong>{data.recharges.filter((item) => item.status === "PENDING").length} 条待审核</strong>
              <span className="muted">下方可继续查看历史充值记录</span>
            </div>
          </div>
        </section>

        <CustomerRechargePanel recharges={data.recharges} action={createRechargeRequestAction} />
      </div>
    </Shell>
  );
}
