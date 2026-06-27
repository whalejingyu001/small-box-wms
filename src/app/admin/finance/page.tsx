import { UserRole } from "@prisma/client";
import { ChartColumn } from "lucide-react";
import { Shell } from "@/components/layout";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createBillingPlanAction } from "@/server/actions";
import { formatDate, formatMoney, formatStatusLabel } from "@/lib/utils";

export default async function AdminFinancePage() {
  const session = await requireRole([UserRole.ADMIN]);
  const customers = await prisma.customer.findMany({
    include: {
      billingPlans: {
        where: { enabled: true },
        orderBy: { effectiveAt: "desc" },
        take: 1
      }
    },
    orderBy: { companyName: "asc" }
  });

  const configuredCount = customers.filter((customer) => customer.billingPlans[0]).length;

  return (
    <Shell session={session}>
      <div className="page-stack">
        <section className="card soft admin-overview-hero">
          <div className="section-head">
            <div>
              <span className="pill">报价中心</span>
              <h2>客户报价中心</h2>
              <p className="muted">这个页面只负责客户计费方式和报价方案，不再混入充值审核、流水和财务报表。</p>
            </div>
            <div className="admin-overview-side">
              <div className="admin-overview-side-label">报价状态</div>
              <strong>{configuredCount} / {customers.length} 个客户已配置</strong>
              <span className="muted">按箱 / 按件统一在这里维护</span>
            </div>
          </div>
        </section>

        <div className="summary-grid">
          <div className="summary-box">客户总数<strong>{customers.length}</strong></div>
          <div className="summary-box">已配报价<strong>{configuredCount}</strong></div>
          <div className="summary-box">待配置<strong>{customers.length - configuredCount}</strong></div>
        </div>

        <div className="grid two" style={{ gridTemplateColumns: "minmax(0, 0.95fr) minmax(0, 1.05fr)" }}>
          <div className="card soft filter-card">
            <div className="section-head">
              <div>
                <h3>配置计费方案</h3>
                <p className="muted">按箱还是按件、单价多少、生效时间何时开始，都统一在这里设置。</p>
              </div>
            </div>
            <form action={createBillingPlanAction} className="stacked">
              <select name="customerId" required defaultValue="">
                <option value="" disabled>选择客户</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.companyName}
                  </option>
                ))}
              </select>
              <div className="grid three">
                <select name="mode" defaultValue="PER_BOX">
                  <option value="PER_BOX">按箱计费</option>
                  <option value="PER_ITEM">按件计费</option>
                </select>
                <input name="unitPrice" type="number" step="0.01" placeholder="单价" required />
                <input name="currency" defaultValue="USD" placeholder="币种" />
              </div>
              <div className="grid two">
                <input
                  name="effectiveAt"
                  type="datetime-local"
                  defaultValue={new Date().toISOString().slice(0, 16)}
                  required
                />
                <label className="checkbox-inline">
                  <input name="enabled" type="checkbox" defaultChecked />
                  <span>立即启用</span>
                </label>
              </div>
              <input name="remarks" placeholder="备注，可选" />
              <button type="submit">保存计费方案</button>
            </form>
          </div>

          <div className="card soft">
            <div className="section-head">
              <div>
                <h3>当前客户报价</h3>
                <p className="muted">先看当前生效方案，再按客户详情进入查看完整历史。</p>
              </div>
            </div>
            <div className="timeline-list">
              {customers.map((customer) => {
                const activePlan = customer.billingPlans[0] ?? null;
                return (
                  <article key={customer.id} className="timeline-item">
                    <div className="timeline-title-row">
                      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                        <div className="sidebar-profile-avatar">
                          <ChartColumn size={18} strokeWidth={2} />
                        </div>
                        <div>
                          <strong>{customer.companyName}</strong>
                          <div className="muted">{customer.contactName}</div>
                        </div>
                      </div>
                      <span className={`pill ${activePlan ? "success" : "warning"}`}>
                        {activePlan ? formatStatusLabel(activePlan.mode) : "未配置"}
                      </span>
                    </div>
                    <div className="timeline-cluster">
                      <span className="timeline-chip">
                        {activePlan ? formatMoney(activePlan.unitPrice.toString(), activePlan.currency) : "请配置报价"}
                      </span>
                      <span className="timeline-chip">
                        {activePlan ? `生效 ${formatDate(activePlan.effectiveAt)}` : "暂无生效时间"}
                      </span>
                    </div>
                    <div className="timeline-note">{activePlan?.remarks || "无备注"}</div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
