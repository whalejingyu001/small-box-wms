import { UserRole } from "@prisma/client";
import { ChartColumn } from "lucide-react";
import { Shell } from "@/components/layout";
import { requireRole } from "@/lib/auth";
import { buildFinanceReport } from "@/services/finance-report-service";
import { formatMoney } from "@/lib/utils";

export default async function AdminReportsPage({
  searchParams
}: {
  searchParams: Promise<{ dateFrom?: string; dateTo?: string; groupBy?: string }>;
}) {
  const session = await requireRole([UserRole.ADMIN]);
  const params = await searchParams;
  const groupBy = params.groupBy === "month" ? "month" : "day";
  const hasQuery = Boolean(params.dateFrom && params.dateTo);
  const report = hasQuery
    ? await buildFinanceReport({
        dateFrom: params.dateFrom!,
        dateTo: params.dateTo!,
        groupBy
      })
    : null;

  return (
    <Shell session={session}>
      <div className="page-stack">
        <section className="card soft admin-overview-hero">
          <div className="section-head">
            <div>
              <span className="pill">财务报表</span>
              <h2>财务报表</h2>
              <p className="muted">报表查询独立成页，只负责收入、冲正、成本和毛利润汇总，不再和客户报价混在一起。</p>
            </div>
            <div className="admin-overview-side">
              <div className="admin-overview-side-label">当前视角</div>
              <strong>{groupBy === "day" ? "日报模式" : "月报模式"}</strong>
              <span className="muted">{hasQuery ? `${params.dateFrom} 至 ${params.dateTo}` : "先选择日期范围再生成报表"}</span>
            </div>
          </div>
        </section>

        <div className="grid two" style={{ gridTemplateColumns: "minmax(0, 1.15fr) minmax(280px, 0.85fr)" }}>
          <div className="card soft filter-card">
            <div className="section-head">
              <div>
                <h3>查询条件</h3>
                <p className="muted">按日期范围输出日报或月报，收入来自钱包流水，成本来自每日成本记录。</p>
              </div>
            </div>
            <form method="GET" className="stacked">
              <div className="grid three">
                <input name="dateFrom" type="date" defaultValue={params.dateFrom || ""} required />
                <input name="dateTo" type="date" defaultValue={params.dateTo || ""} required />
                <select name="groupBy" defaultValue={groupBy}>
                  <option value="day">日汇总</option>
                  <option value="month">月汇总</option>
                </select>
              </div>
              <div className="toolbar">
                <button type="submit">查询报表</button>
                {report ? (
                  <a
                    href={`/api/finance/export?dateFrom=${params.dateFrom}&dateTo=${params.dateTo}&groupBy=${groupBy}`}
                    target="_blank"
                  >
                    导出 CSV
                  </a>
                ) : null}
              </div>
            </form>
          </div>

          <div className="card soft stacked">
            <div className="section-head">
              <div>
                <h3>使用提示</h3>
                <p className="muted">先定时间维度，再下钻汇总结果，避免把报价和审核动作混进报表页面。</p>
              </div>
            </div>
            <div className="compact-list">
              <div className="compact-item">
                <strong>摘要优先</strong>
                <span className="muted">先看收入、成本和毛利润，再决定是否导出。</span>
              </div>
              <div className="compact-item">
                <strong>导出保持原链路</strong>
                <span className="muted">CSV 出口与现有接口完全一致。</span>
              </div>
              <div className="compact-item">
                <strong>页面状态</strong>
                <span className="muted">{report ? `已生成 ${report.rows.length} 条${groupBy === "day" ? "周期" : "月份"}汇总。` : "当前还没有生成报表结果。"}</span>
              </div>
            </div>
          </div>
        </div>

        {report ? (
          <>
            <div className="summary-grid">
              <div className="summary-box">充值金额<strong>{formatMoney(report.totals.rechargeAmount, "USD")}</strong></div>
              <div className="summary-box">按箱收入<strong>{formatMoney(report.totals.boxIncome, "USD")}</strong></div>
              <div className="summary-box">按件收入<strong>{formatMoney(report.totals.itemIncome, "USD")}</strong></div>
              <div className="summary-box">冲正金额<strong>{formatMoney(report.totals.reversalAmount, "USD")}</strong></div>
              <div className="summary-box">总收入<strong>{formatMoney(report.totals.totalIncome, "USD")}</strong></div>
              <div className="summary-box">成本<strong>{formatMoney(report.totals.cost, "USD")}</strong></div>
              <div className="summary-box">毛利润<strong>{formatMoney(report.totals.grossProfit, "USD")}</strong></div>
            </div>

            <section className="card soft">
              <div className="section-head">
                <div>
                  <h3>报表明细</h3>
                  <p className="muted">当前按 {groupBy === "day" ? "日" : "月"} 汇总展示。</p>
                </div>
              </div>
              <div className="timeline-list">
                {report.rows.map((row) => (
                  <article key={row.period} className="timeline-item">
                    <div className="timeline-title-row">
                      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                        <div className="sidebar-profile-avatar">
                          <ChartColumn size={18} strokeWidth={2} />
                        </div>
                        <div>
                          <strong>{row.period}</strong>
                          <div className="muted">{groupBy === "day" ? "单日汇总" : "单月汇总"}</div>
                        </div>
                      </div>
                      <span className="timeline-chip">毛利润 {formatMoney(row.grossProfit, "USD")}</span>
                    </div>
                    <div className="timeline-cluster">
                      <span className="timeline-chip">充值 {formatMoney(row.rechargeAmount, "USD")}</span>
                      <span className="timeline-chip">按箱 {formatMoney(row.boxIncome, "USD")}</span>
                      <span className="timeline-chip">按件 {formatMoney(row.itemIncome, "USD")}</span>
                      <span className="timeline-chip">冲正 {formatMoney(row.reversalAmount, "USD")}</span>
                      <span className="timeline-chip">总收入 {formatMoney(row.totalIncome, "USD")}</span>
                      <span className="timeline-chip">成本 {formatMoney(row.cost, "USD")}</span>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </>
        ) : null}
      </div>
    </Shell>
  );
}
