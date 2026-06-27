import { UserRole } from "@prisma/client";
import { Shell } from "@/components/layout";
import { requireRole } from "@/lib/auth";
import { CustomerForecastList } from "@/components/customer-forecast-list";
import { getCustomerWorkspaceData } from "@/services/customer-workspace-service";

export default async function CustomerForecastsPage() {
  const session = await requireRole([UserRole.CUSTOMER]);
  const data = await getCustomerWorkspaceData(session.customerId!);

  return (
    <Shell session={session}>
      <div className="page-stack">
        <section className="card soft admin-overview-hero">
          <div className="section-head">
            <div>
              <span className="pill">预报中心</span>
              <h2>预报列表</h2>
              <p className="muted">所有预报独立出来查看。这里专门负责回看预报、状态和箱唛导出。</p>
            </div>
            <div className="admin-overview-side">
              <div className="admin-overview-side-label">当前数量</div>
              <strong>{data.forecasts.length} 个预报</strong>
              <span className="muted">按创建时间倒序排列</span>
            </div>
          </div>
        </section>

        <CustomerForecastList forecasts={data.forecasts} />
      </div>
    </Shell>
  );
}
