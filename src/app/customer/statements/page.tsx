import { ArrowUpRight, ReceiptText, Wallet } from "lucide-react";
import { UserRole } from "@prisma/client";
import { Shell } from "@/components/layout";
import { requireRole } from "@/lib/auth";
import { formatDate, formatMoney } from "@/lib/utils";
import { buildCustomerStatement } from "@/services/statement-service";

export default async function CustomerStatementsPage({
  searchParams
}: {
  searchParams: Promise<{ dateFrom?: string; dateTo?: string }>;
}) {
  const session = await requireRole([UserRole.CUSTOMER]);
  const params = await searchParams;
  const hasQuery = Boolean(params.dateFrom && params.dateTo);
  const statement = hasQuery
    ? await buildCustomerStatement({
        customerId: session.customerId!,
        dateFrom: params.dateFrom!,
        dateTo: params.dateTo!
      })
    : null;

  return (
    <Shell session={session}>
      <div className="page-stack">
        <section className="card soft admin-overview-hero">
          <div className="section-head">
            <div>
              <span className="pill">客户对账单</span>
              <h2>我的对账单</h2>
              <p className="muted">
                先选择日期范围，再查看摘要、导出文件和流水明细。页面结构和管理端保持同一套大圆角浅色面板风格。
              </p>
            </div>
            <div className="admin-overview-side">
              <div className="admin-overview-side-label">账单范围</div>
              <strong>{hasQuery ? `${params.dateFrom} 至 ${params.dateTo}` : "等待选择日期"}</strong>
              <span className="muted">
                {statement ? `${statement.transactions.length} 条钱包流水` : "仅展示当前客户自己的账单数据"}
              </span>
            </div>
          </div>
        </section>

        <section className="card soft filter-card">
          <div className="section-head">
            <div>
              <h3>查询条件</h3>
              <p className="muted">对账金额全部来自钱包流水，只允许查看当前客户自己的数据。</p>
            </div>
            <span className="pill">筛选条件</span>
          </div>
          <form method="GET" className="stacked">
            <div className="grid two">
              <input name="dateFrom" type="date" defaultValue={params.dateFrom || ""} required />
              <input name="dateTo" type="date" defaultValue={params.dateTo || ""} required />
            </div>
            <div className="toolbar">
              <button type="submit">查询对账单</button>
              {statement ? (
                <>
                  <a href={`/api/statements/export?dateFrom=${params.dateFrom}&dateTo=${params.dateTo}`} target="_blank">
                    导出 CSV
                  </a>
                  <a
                    href={`/api/statements/export?format=pdf&dateFrom=${params.dateFrom}&dateTo=${params.dateTo}`}
                    target="_blank"
                  >
                    导出 PDF
                  </a>
                </>
              ) : null}
            </div>
          </form>
        </section>

        {statement ? (
          <>
            <div className="summary-grid">
              <div className="summary-box">
                期初余额<strong>{formatMoney(statement.totals.openingBalance, statement.wallet.currency)}</strong>
              </div>
              <div className="summary-box">
                充值金额<strong>{formatMoney(statement.totals.rechargeAmount, statement.wallet.currency)}</strong>
              </div>
              <div className="summary-box">
                按箱扣费<strong>{formatMoney(statement.totals.boxChargeAmount, statement.wallet.currency)}</strong>
              </div>
              <div className="summary-box">
                按件扣费<strong>{formatMoney(statement.totals.itemChargeAmount, statement.wallet.currency)}</strong>
              </div>
              <div className="summary-box">
                冲正金额<strong>{formatMoney(statement.totals.reversalAmount, statement.wallet.currency)}</strong>
              </div>
              <div className="summary-box">
                期末余额<strong>{formatMoney(statement.totals.closingBalance, statement.wallet.currency)}</strong>
              </div>
            </div>

            <section className="card soft">
              <div className="section-head">
                <div>
                  <h3>流水时间线</h3>
                  <p className="muted">用卡片时间线代替传统明细表，快速查看业务说明、关联对象和余额变化。</p>
                </div>
                <span className="muted">共 {statement.transactions.length} 条</span>
              </div>

              <div className="timeline-list">
                {statement.transactions.map((item) => (
                  <article key={item.id} className="timeline-item">
                    <div className="timeline-title-row">
                      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                        <div className="sidebar-profile-avatar">
                          {item.type.includes("RECHARGE") ? (
                            <Wallet size={18} strokeWidth={2} />
                          ) : (
                            <ReceiptText size={18} strokeWidth={2} />
                          )}
                        </div>
                        <div>
                          <strong>{item.type}</strong>
                          <div className="muted">{formatDate(item.createdAt)}</div>
                        </div>
                      </div>
                      <span className="timeline-chip">{formatMoney(item.amount.toString(), item.currency)}</span>
                    </div>

                    <div className="timeline-cluster">
                      <span className="timeline-chip">预报 {item.forecast?.forecastNo || "-"}</span>
                      <span className="timeline-chip">箱号 {item.forecastBox?.boxNo || "-"}</span>
                      <span className="timeline-chip">追踪号 {item.trackingNo || "-"}</span>
                    </div>

                    <div className="timeline-note">
                      <div className="detail-row">
                        <strong>业务说明</strong>
                        <span>{item.remarks || "-"}</span>
                      </div>
                      <div className="detail-row">
                        <strong>余额变化</strong>
                        <span>
                          {formatMoney(item.balanceBefore.toString(), item.currency)} {"->"}{" "}
                          {formatMoney(item.balanceAfter.toString(), item.currency)}
                        </span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="card soft">
              <div className="section-head">
                <div>
                  <h3>导出说明</h3>
                  <p className="muted">需要正式留档时，可以继续导出 CSV 或 PDF，与后台同口径保持一致。</p>
                </div>
              </div>
              <div className="timeline-list">
                <article className="timeline-item">
                  <div className="timeline-title-row">
                    <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                      <div className="sidebar-profile-avatar">
                        <ReceiptText size={18} strokeWidth={2} />
                      </div>
                      <div>
                        <strong>账单导出</strong>
                        <div className="muted">当前日期范围导出</div>
                      </div>
                    </div>
                    <span className="pill">导出</span>
                  </div>
                  <div className="timeline-actions">
                    <a href={`/api/statements/export?dateFrom=${params.dateFrom}&dateTo=${params.dateTo}`} target="_blank" className="button-link secondary">
                      导出 CSV
                      <ArrowUpRight size={14} strokeWidth={2} />
                    </a>
                    <a
                      href={`/api/statements/export?format=pdf&dateFrom=${params.dateFrom}&dateTo=${params.dateTo}`}
                      target="_blank"
                      className="button-link"
                    >
                      导出 PDF
                      <ArrowUpRight size={14} strokeWidth={2} />
                    </a>
                  </div>
                </article>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </Shell>
  );
}
