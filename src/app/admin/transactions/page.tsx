import { UserRole } from "@prisma/client";
import { RefreshCw, Wallet } from "lucide-react";
import { Shell } from "@/components/layout";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { reverseWalletTransactionAction } from "@/server/actions";
import { formatDate, formatMoney, formatStatusLabel, getStatusTone } from "@/lib/utils";

export default async function AdminTransactionsPage() {
  const session = await requireRole([UserRole.ADMIN]);
  const [reversibleTransactions, recentTransactions] = await Promise.all([
    prisma.walletTransaction.findMany({
      where: {
        type: { not: "REVERSAL" },
        reversalTransactions: { none: {} }
      },
      include: {
        wallet: { include: { customer: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 20
    }),
    prisma.walletTransaction.findMany({
      include: {
        wallet: { include: { customer: true } },
        forecast: true,
        forecastBox: true
      },
      orderBy: { createdAt: "desc" },
      take: 20
    })
  ]);

  return (
    <Shell session={session}>
      <div className="page-stack">
        <section className="card soft admin-overview-hero">
          <div className="section-head">
            <div>
              <span className="pill">资金流水</span>
              <h2>资金流水</h2>
              <p className="muted">把流水查询和冲正操作单独整理出来，避免在报价页和审核页里来回切换。</p>
            </div>
            <div className="admin-overview-side">
              <div className="admin-overview-side-label">当前可冲正</div>
              <strong>{reversibleTransactions.length} 条</strong>
              <span className="muted">下方可直接创建冲正</span>
            </div>
          </div>
        </section>

        <div className="split-grid">
          <section className="card soft">
            <div className="section-head">
              <div>
                <h3>可冲正流水</h3>
                <p className="muted">只展示当前还能创建冲正的资金动作。</p>
              </div>
            </div>
            <div className="timeline-list">
              {reversibleTransactions.length > 0 ? (
                reversibleTransactions.map((item) => (
                  <article key={item.id} className="timeline-item">
                    <div className="timeline-title-row">
                      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                        <div className="sidebar-profile-avatar">
                          <RefreshCw size={18} strokeWidth={2} />
                        </div>
                        <div>
                          <strong>{item.wallet.customer.companyName}</strong>
                          <div className="muted">{formatStatusLabel(item.type)} / {formatDate(item.createdAt)}</div>
                        </div>
                      </div>
                      <span className="timeline-chip">{formatMoney(item.amount.toString(), item.currency)}</span>
                    </div>
                    <form action={reverseWalletTransactionAction} className="admin-inline-form">
                      <input type="hidden" name="transactionId" value={item.id} />
                      <input name="reason" placeholder="冲正原因" required />
                      <button type="submit" className="secondary">创建冲正</button>
                    </form>
                  </article>
                ))
              ) : (
                <div className="muted">当前没有可冲正流水。</div>
              )}
            </div>
          </section>

          <section className="card soft">
            <div className="section-head">
              <div>
                <h3>最近资金流水</h3>
                <p className="muted">统一回看充值、按箱、按件和冲正等资金动作。</p>
              </div>
            </div>
            <div className="timeline-list">
              {recentTransactions.map((item) => (
                <article key={item.id} className="timeline-item">
                  <div className="timeline-title-row">
                    <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                      <div className="sidebar-profile-avatar">
                        <Wallet size={18} strokeWidth={2} />
                      </div>
                      <div>
                        <strong>{item.wallet.customer.companyName}</strong>
                        <div className="muted">{formatStatusLabel(item.type)} / {formatDate(item.createdAt)}</div>
                      </div>
                    </div>
                    <span className={`pill ${getStatusTone(item.status)}`}>{formatStatusLabel(item.status)}</span>
                  </div>
                  <div className="timeline-cluster">
                    <span className="timeline-chip">{formatMoney(item.amount.toString(), item.currency)}</span>
                    <span className="timeline-chip">预报 {item.forecast?.forecastNo || "-"}</span>
                    <span className="timeline-chip">箱号 {item.forecastBox?.boxNo || "-"}</span>
                    <span className="timeline-chip">追踪号 {item.trackingNo || "-"}</span>
                  </div>
                  <div className="timeline-meta-row">
                    <span>变动前 {formatMoney(item.balanceBefore.toString(), item.currency)}</span>
                    <span>变动后 {formatMoney(item.balanceAfter.toString(), item.currency)}</span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </Shell>
  );
}
