import { UserRole } from "@prisma/client";
import { Shell } from "@/components/layout";
import { requireRole } from "@/lib/auth";
import { CustomerForecastForm } from "@/components/customer-forecast-form";
import { createForecastAction } from "@/server/actions";
import { getCustomerWorkspaceData } from "@/services/customer-workspace-service";
import { formatMoney } from "@/lib/utils";

export default async function CustomerPage() {
  const session = await requireRole([UserRole.CUSTOMER]);
  const data = await getCustomerWorkspaceData(session.customerId!);
  const pendingRechargeCount = data.recharges.filter((item) => item.status === "PENDING").length;

  return (
    <Shell session={session}>
      <div className="page-stack">
        <section className="card soft admin-overview-hero">
          <div className="section-head">
            <div>
              <span className="pill">预报填写页</span>
              <h2>预报填写</h2>
              <p className="muted">客户端只保留最常用的 4 个页面。当前页只负责填写和提交预报，不再混入预报列表和充值区。</p>
            </div>
            <div className="admin-overview-side">
              <div className="admin-overview-side-label">当前钱包</div>
              <strong>{formatMoney(data.wallet?.balance.toString() || 0, data.wallet?.currency || "USD")}</strong>
              <span className="muted">待审核充值 {pendingRechargeCount} 条</span>
            </div>
          </div>
        </section>

        <div className="summary-grid">
          <div className="summary-box">
            当前余额
            <strong>{formatMoney(data.wallet?.balance.toString() || 0, data.wallet?.currency || "USD")}</strong>
          </div>
          <div className="summary-box">
            预报总数
            <strong>{data.forecasts.length}</strong>
          </div>
          <div className="summary-box">
            待审核充值
            <strong>{pendingRechargeCount}</strong>
          </div>
          <div className="summary-box">
            最近流水
            <strong>{data.transactions.length}</strong>
          </div>
        </div>

        <section className="dashboard-grid">
          <div className="dashboard-span-12">
            <CustomerForecastForm channels={data.channels} action={createForecastAction} />
          </div>
        </section>
      </div>
    </Shell>
  );
}
