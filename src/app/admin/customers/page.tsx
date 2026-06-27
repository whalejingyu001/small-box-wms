import Link from "next/link";
import { UserRole } from "@prisma/client";
import { ArrowUpRight, BadgeDollarSign, Building2, UserRound } from "lucide-react";
import { Shell } from "@/components/layout";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate, formatMoney, formatStatusLabel, getStatusTone } from "@/lib/utils";
import { createCustomerAction, updateCustomerStatusAction } from "@/server/actions";

export default async function AdminCustomersPage() {
  const session = await requireRole([UserRole.ADMIN]);
  const customers = await prisma.customer.findMany({
    include: {
      wallet: true,
      users: true,
      forecasts: {
        orderBy: { createdAt: "desc" },
        take: 1
      },
      rechargeRequests: {
        orderBy: { createdAt: "desc" },
        take: 1
      }
    },
    orderBy: { createdAt: "desc" }
  });

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

  const activeCount = customers.filter((item) => item.status === "ACTIVE").length;
  const enabledCustomers = customers.filter((item) => item.status === "ACTIVE");
  const disabledCustomers = customers.filter((item) => item.status !== "ACTIVE");

  function renderCustomerCard(customer: (typeof customers)[number]) {
    return (
      <article key={customer.id} className="dashboard-span-4">
        <div className="timeline-item" style={summaryStyle}>
          <div className="timeline-title-row">
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
              <div className="sidebar-profile-avatar">
                <Building2 size={18} strokeWidth={2} />
              </div>
              <div>
                <strong>{customer.companyName}</strong>
                <div className="muted">{customer.contactName}</div>
              </div>
            </div>
            <span className={`pill ${getStatusTone(customer.status)}`}>{formatStatusLabel(customer.status)}</span>
          </div>

          <div className="timeline-cluster">
            <span className="timeline-chip">
              <BadgeDollarSign size={14} strokeWidth={2} />
              {formatMoney(customer.wallet?.balance.toString() || 0, customer.wallet?.currency || "USD")}
            </span>
            <span className="timeline-chip">
              <UserRound size={14} strokeWidth={2} />
              {customer.users[0]?.username || "-"}
            </span>
          </div>

          <div className="timeline-meta-row">
            <span>客户编码 {customer.code}</span>
            <span>最近预报 {customer.forecasts[0] ? formatDate(customer.forecasts[0].createdAt) : "-"}</span>
          </div>

          <div className="timeline-note">
            最近充值 {customer.rechargeRequests[0] ? formatDate(customer.rechargeRequests[0].createdAt) : "-"}
          </div>

          <div className="timeline-actions">
            <div className="checkbox-grid">
              <Link href={`/admin/customers/${customer.id}`} className="button-link secondary">
                客户详情
              </Link>
              <form action={updateCustomerStatusAction}>
                <input type="hidden" name="customerId" value={customer.id} />
                <input
                  type="hidden"
                  name="status"
                  value={customer.status === "ACTIVE" ? "DISABLED" : "ACTIVE"}
                />
                <button type="submit" className={customer.status === "ACTIVE" ? "warning" : "secondary"}>
                  {customer.status === "ACTIVE" ? "停用客户" : "启用客户"}
                </button>
              </form>
            </div>
            <Link href={`/admin/customers/${customer.id}/workspace`} className="button-link">
              进入客户界面
              <ArrowUpRight size={14} strokeWidth={2} />
            </Link>
          </div>
        </div>
      </article>
    );
  }

  return (
    <Shell session={session}>
      <div className="page-stack" style={pageShellStyle}>
        <section className="card soft" style={heroStyle}>
          <div className="section-head">
            <div>
              <span className="pill">客户总览</span>
              <h2>客户列表</h2>
              <p className="muted">集中查看全部客户，并从管理端直接进入对应客户的客户端工作台预览或客户详情。</p>
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
              <div className="admin-overview-side-label">客户概览</div>
              <strong>{customers.length} 个客户</strong>
              <span className="muted">{activeCount} 个启用中</span>
            </div>
          </div>
        </section>

        <div className="summary-grid">
          <div className="summary-box" style={summaryStyle}>客户总数<strong>{customers.length}</strong></div>
          <div className="summary-box" style={summaryStyle}>启用客户<strong>{activeCount}</strong></div>
          <div className="summary-box" style={summaryStyle}>停用客户<strong>{customers.length - activeCount}</strong></div>
        </div>

        <section className="card soft" style={sectionStyle}>
          <div className="section-head">
            <div>
              <h3>客户开户</h3>
              <p className="muted">开户动作放回客户列表页，避免后台首页和系统首页都堆同类入口。</p>
            </div>
            <span className="pill info">客户开户</span>
          </div>
          <form action={createCustomerAction} className="stacked">
            <div className="grid two">
              <input name="companyName" placeholder="公司名" required />
              <input name="contactName" placeholder="联系人" required />
            </div>
            <div className="grid three">
              <input name="code" placeholder="客户编码" required />
              <input name="username" placeholder="登录账号" required />
              <input name="password" placeholder="登录密码" required />
            </div>
            <div className="grid two">
              <select name="status" defaultValue="ACTIVE">
                <option value="ACTIVE">启用</option>
                <option value="DISABLED">停用</option>
              </select>
              <input name="remarks" placeholder="备注，可选" />
            </div>
            <div className="toolbar">
              <button type="submit">创建客户</button>
              <span className="muted">创建后客户会出现在下方清单，并可直接进入详情或客户端预览。</span>
            </div>
          </form>
        </section>

        <section className="card soft" style={sectionStyle}>
          <div className="section-head">
            <div>
              <h3>启用客户</h3>
              <p className="muted">只展示当前可正常使用的客户，停用客户单独收进下方，避免客户变多后混在一起。</p>
            </div>
            <span className="pill success">{enabledCustomers.length} 个启用中</span>
          </div>
          <div className="dashboard-grid">
            {enabledCustomers.length > 0 ? enabledCustomers.map(renderCustomerCard) : <div className="muted">当前没有启用客户。</div>}
          </div>
        </section>

        <section className="card soft" style={sectionStyle}>
          <div className="section-head">
            <div>
              <h3>停用客户</h3>
              <p className="muted">停用客户单独保留，只有需要恢复时再进入处理，不干扰日常客户管理。</p>
            </div>
            <span className="pill warning">{disabledCustomers.length} 个已停用</span>
          </div>
          <div className="dashboard-grid">
            {disabledCustomers.length > 0 ? (
              disabledCustomers.map(renderCustomerCard)
            ) : (
              <div className="muted">当前没有停用客户。</div>
            )}
          </div>
        </section>
      </div>
    </Shell>
  );
}
