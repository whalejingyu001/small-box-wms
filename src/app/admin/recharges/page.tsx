import { UserRole } from "@prisma/client";
import { ArrowUpRight, Coins, ReceiptText } from "lucide-react";
import { Shell } from "@/components/layout";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { approveRechargeAction, rejectRechargeAction } from "@/server/actions";
import { formatDate, formatMoney, formatStatusLabel, getStatusTone } from "@/lib/utils";

export default async function AdminRechargesPage() {
  const session = await requireRole([UserRole.ADMIN]);
  const [pendingRechargeRequests, recentRechargeRequests] = await Promise.all([
    prisma.rechargeRequest.findMany({
      where: { status: "PENDING" },
      include: { customer: true, attachment: true },
      orderBy: { createdAt: "desc" },
      take: 20
    }),
    prisma.rechargeRequest.findMany({
      include: { customer: true, attachment: true },
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
              <span className="pill">充值审核</span>
              <h2>充值审核</h2>
              <p className="muted">充值审核独立出来处理，这里只看待审核申请和最近充值记录，不再和报价、流水混在一起。</p>
            </div>
            <div className="admin-overview-side">
              <div className="admin-overview-side-label">待处理</div>
              <strong>{pendingRechargeRequests.length} 条申请</strong>
              <span className="muted">可直接通过或驳回</span>
            </div>
          </div>
        </section>

        <div className="split-grid">
          <section className="card soft">
            <div className="section-head">
              <div>
                <h3>待审核充值</h3>
                <p className="muted">先处理影响客户余额使用的申请。</p>
              </div>
            </div>
            <div className="timeline-list">
              {pendingRechargeRequests.length > 0 ? (
                pendingRechargeRequests.map((item) => (
                  <article key={item.id} className="timeline-item">
                    <div className="timeline-title-row">
                      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                        <div className="sidebar-profile-avatar">
                          <Coins size={18} strokeWidth={2} />
                        </div>
                        <div>
                          <strong>{item.customer.companyName}</strong>
                          <div className="muted">{item.paymentChannel} / {formatDate(item.createdAt)}</div>
                        </div>
                      </div>
                      <span className="timeline-chip">{formatMoney(item.amount.toString(), item.currency)}</span>
                    </div>
                    <div className="timeline-actions">
                      <form action={approveRechargeAction}>
                        <input type="hidden" name="rechargeRequestId" value={item.id} />
                        <button type="submit">通过</button>
                      </form>
                      <form action={rejectRechargeAction} className="admin-inline-form">
                        <input type="hidden" name="rechargeRequestId" value={item.id} />
                        <input name="reason" placeholder="驳回原因" required />
                        <button type="submit" className="secondary">驳回</button>
                      </form>
                    </div>
                    {item.attachment ? (
                      <a href={`/api/files/${item.attachment.id}`} target="_blank" className="button-link secondary">
                        查看凭证附件
                        <ArrowUpRight size={14} strokeWidth={2} />
                      </a>
                    ) : null}
                  </article>
                ))
              ) : (
                <div className="muted">当前没有待审核充值。</div>
              )}
            </div>
          </section>

          <section className="card soft">
            <div className="section-head">
              <div>
                <h3>最近充值记录</h3>
                <p className="muted">独立回看充值历史、状态和备注。</p>
              </div>
            </div>
            <div className="timeline-list">
              {recentRechargeRequests.map((item) => (
                <article key={item.id} className="timeline-item">
                  <div className="timeline-title-row">
                    <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                      <div className="sidebar-profile-avatar">
                        <ReceiptText size={18} strokeWidth={2} />
                      </div>
                      <div>
                        <strong>{item.customer.companyName}</strong>
                        <div className="muted">{item.paymentChannel} / {formatDate(item.createdAt)}</div>
                      </div>
                    </div>
                    <span className={`pill ${getStatusTone(item.status)}`}>{formatStatusLabel(item.status)}</span>
                  </div>
                  <div className="timeline-meta-row">
                    <span>{formatMoney(item.amount.toString(), item.currency)}</span>
                    <span>{item.rejectReason || item.remarks || "-"}</span>
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
