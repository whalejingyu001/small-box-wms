import { UserRole } from "@prisma/client";
import { ArrowUpRight, ReceiptText, Wallet } from "lucide-react";
import { Shell } from "@/components/layout";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate, formatMoney } from "@/lib/utils";
import { buildCustomerStatement } from "@/services/statement-service";

export default async function AdminStatementsPage({
  searchParams
}: {
  searchParams: Promise<{ customerId?: string; dateFrom?: string; dateTo?: string }>;
}) {
  const session = await requireRole([UserRole.ADMIN]);
  const params = await searchParams;
  const customers = await prisma.customer.findMany({ orderBy: { companyName: "asc" } });

  const hasQuery = Boolean(params.customerId && params.dateFrom && params.dateTo);
  const statement = hasQuery
    ? await buildCustomerStatement({
        customerId: params.customerId!,
        dateFrom: params.dateFrom!,
        dateTo: params.dateTo!
      })
    : null;

  const pageShellStyle = {
    ["--card" as string]: "rgba(255, 255, 255, 0.96)",
    ["--shadow" as string]: "0 24px 48px rgba(148, 163, 184, 0.18)",
    padding: "1rem",
    borderRadius: "32px",
    background: "linear-gradient(180deg, rgba(239, 247, 255, 0.96) 0%, rgba(250, 246, 239, 0.98) 100%)",
    border: "1px solid rgba(191, 219, 254, 0.7)",
    boxShadow: "0 24px 60px rgba(148, 163, 184, 0.12)"
  };
  const heroStyle = {
    borderRadius: "32px",
    padding: "1.5rem",
    border: "1px solid rgba(219, 234, 254, 0.95)",
    background: "linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(247, 250, 255, 0.96))",
    boxShadow: "0 26px 60px rgba(148, 163, 184, 0.14)"
  };
  const sectionStyle = {
    borderRadius: "28px",
    padding: "1.25rem",
    border: "1px solid rgba(219, 234, 254, 0.9)",
    background: "rgba(255, 255, 255, 0.95)",
    boxShadow: "0 18px 40px rgba(148, 163, 184, 0.12)"
  };
  const summaryStyle = {
    borderRadius: "24px",
    border: "1px solid rgba(219, 234, 254, 0.9)",
    background: "linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(246, 249, 255, 0.95))",
    boxShadow: "0 14px 32px rgba(148, 163, 184, 0.12)"
  };

  return (
    <Shell session={session}>
      <div className="page-stack" style={pageShellStyle}>
        <section className="card soft" style={heroStyle}>
          <div className="section-head">
            <div>
              <span className="pill">对账中心</span>
              <h2>客户对账单</h2>
              <p className="muted">按客户和日期范围汇总钱包流水，并支持 CSV / PDF 导出。现在用同一套大白面板把筛选、摘要和明细收在一起。</p>
            </div>
            <div
              className="admin-overview-side"
              style={{
                minWidth: "240px",
                borderRadius: "24px",
                border: "1px solid rgba(219, 234, 254, 0.95)",
                background: "linear-gradient(180deg, rgba(240, 249, 255, 0.92), rgba(255, 251, 235, 0.9))"
              }}
            >
              <div className="admin-overview-side-label">查询状态</div>
              <strong>{statement ? statement.customer.companyName : "等待选择客户"}</strong>
              <span className="muted">{hasQuery ? `${params.dateFrom} 至 ${params.dateTo}` : "先选择客户和日期范围"}</span>
            </div>
          </div>
        </section>

        <div className="card soft filter-card" style={sectionStyle}>
          <div className="section-head">
            <div>
              <h3>查询条件</h3>
              <p className="muted">选择客户与日期范围后，再展示对账摘要和流水。</p>
            </div>
          </div>
          <form method="GET" className="stacked">
            <div className="grid three">
              <select name="customerId" defaultValue={params.customerId || ""} required>
                <option value="">选择客户</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>{customer.companyName}</option>
                ))}
              </select>
              <input name="dateFrom" type="date" defaultValue={params.dateFrom || ""} required />
              <input name="dateTo" type="date" defaultValue={params.dateTo || ""} required />
            </div>
            <div className="toolbar">
              <button type="submit">查询对账单</button>
              {statement ? (
                <>
                  <a
                    href={`/api/statements/export?customerId=${statement.customer.id}&dateFrom=${params.dateFrom}&dateTo=${params.dateTo}`}
                    target="_blank"
                  >
                    导出 CSV
                  </a>
                  <a
                    href={`/api/statements/export?format=pdf&customerId=${statement.customer.id}&dateFrom=${params.dateFrom}&dateTo=${params.dateTo}`}
                    target="_blank"
                  >
                    导出 PDF
                  </a>
                </>
              ) : null}
            </div>
          </form>
        </div>

        {statement ? (
          <>
            <div className="summary-grid">
              <div className="summary-box" style={summaryStyle}>期初余额<strong>{formatMoney(statement.totals.openingBalance, statement.wallet.currency)}</strong></div>
              <div className="summary-box" style={summaryStyle}>充值金额<strong>{formatMoney(statement.totals.rechargeAmount, statement.wallet.currency)}</strong></div>
              <div className="summary-box" style={summaryStyle}>按箱扣费<strong>{formatMoney(statement.totals.boxChargeAmount, statement.wallet.currency)}</strong></div>
              <div className="summary-box" style={summaryStyle}>按件扣费<strong>{formatMoney(statement.totals.itemChargeAmount, statement.wallet.currency)}</strong></div>
              <div className="summary-box" style={summaryStyle}>冲正金额<strong>{formatMoney(statement.totals.reversalAmount, statement.wallet.currency)}</strong></div>
              <div className="summary-box" style={summaryStyle}>期末余额<strong>{formatMoney(statement.totals.closingBalance, statement.wallet.currency)}</strong></div>
            </div>

            <div className="card soft" style={sectionStyle}>
              <div className="section-head">
                <div>
                  <h3>流水明细</h3>
                  <p className="muted">按时间线看客户账务变化，保留所有原字段但不再用传统后台表格表达。</p>
                </div>
              </div>
              <div className="timeline-list">
                {statement.transactions.map((item) => (
                  <div key={item.id} className="timeline-item">
                    <div className="timeline-title-row">
                      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                        <div className="sidebar-profile-avatar">
                          <Wallet size={18} strokeWidth={2} />
                        </div>
                        <div>
                          <strong>{item.type}</strong>
                          <div className="muted">{formatDate(item.createdAt)}</div>
                        </div>
                      </div>
                      <span className="timeline-chip">{formatMoney(item.amount.toString(), item.currency)}</span>
                    </div>
                    <div className="timeline-meta-row">
                      <span>预报 {item.forecast?.forecastNo || "-"}</span>
                      <span>箱号 {item.forecastBox?.boxNo || "-"}</span>
                      <span>追踪号 {item.trackingNo || "-"}</span>
                    </div>
                    <div className="timeline-note">{item.remarks || "无业务说明"}</div>
                    <div className="timeline-actions">
                      <span className="timeline-chip">
                        <ReceiptText size={14} strokeWidth={2} />
                        变动前 {formatMoney(item.balanceBefore.toString(), item.currency)}
                      </span>
                      <span className="timeline-chip">
                        <ArrowUpRight size={14} strokeWidth={2} />
                        变动后 {formatMoney(item.balanceAfter.toString(), item.currency)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </Shell>
  );
}
