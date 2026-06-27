import { UserRole } from "@prisma/client";
import { Shield, UserRound, Warehouse } from "lucide-react";
import { Shell } from "@/components/layout";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { createInternalUserAction } from "@/server/actions";

function roleMeta(role: UserRole) {
  if (role === UserRole.ADMIN) {
    return {
      label: "管理端账号",
      tone: "info",
      icon: Shield
    } as const;
  }

  return {
    label: "仓库账号",
    tone: "success",
    icon: Warehouse
  } as const;
}

export default async function AdminAccountsPage() {
  const session = await requireRole([UserRole.ADMIN]);
  const internalUsers = await prisma.user.findMany({
    where: {
      role: {
        in: [UserRole.ADMIN, UserRole.WAREHOUSE_OPERATOR]
      }
    },
    orderBy: [{ role: "asc" }, { createdAt: "desc" }]
  });

  const adminUsers = internalUsers.filter((item) => item.role === UserRole.ADMIN);
  const warehouseUsers = internalUsers.filter((item) => item.role === UserRole.WAREHOUSE_OPERATOR);

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

  function renderUserCard(user: (typeof internalUsers)[number]) {
    const meta = roleMeta(user.role);
    const Icon = meta.icon;

    return (
      <article key={user.id} className="dashboard-span-4">
        <div className="timeline-item" style={summaryStyle}>
          <div className="timeline-title-row">
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
              <div className="sidebar-profile-avatar">
                <Icon size={18} strokeWidth={2} />
              </div>
              <div>
                <strong>{user.name}</strong>
                <div className="muted">{user.username}</div>
              </div>
            </div>
            <span className={`pill ${meta.tone}`}>{meta.label}</span>
          </div>

          <div className="timeline-cluster">
            <span className="timeline-chip">
              <UserRound size={14} strokeWidth={2} />
              {meta.label}
            </span>
          </div>

          <div className="timeline-meta-row">
            <span>创建时间 {formatDate(user.createdAt)}</span>
            <span>账号类型 {meta.label}</span>
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
              <span className="pill">内部账号</span>
              <h2>账号管理</h2>
              <p className="muted">在管理端统一添加仓库账号和管理端账号，不再分散到命令行或种子脚本里处理。</p>
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
              <div className="admin-overview-side-label">内部账号概览</div>
              <strong>{internalUsers.length} 个账号</strong>
              <span className="muted">管理端 {adminUsers.length} / 仓库端 {warehouseUsers.length}</span>
            </div>
          </div>
        </section>

        <div className="summary-grid">
          <div className="summary-box" style={summaryStyle}>内部账号总数<strong>{internalUsers.length}</strong></div>
          <div className="summary-box" style={summaryStyle}>管理端账号<strong>{adminUsers.length}</strong></div>
          <div className="summary-box" style={summaryStyle}>仓库端账号<strong>{warehouseUsers.length}</strong></div>
        </div>

        <section className="card soft" style={sectionStyle}>
          <div className="section-head">
            <div>
              <h3>新增内部账号</h3>
              <p className="muted">这里只创建管理后台和仓库操作端账号，客户账号仍然在客户列表页开户。</p>
            </div>
            <span className="pill info">账号创建</span>
          </div>
          <form action={createInternalUserAction} className="stacked">
            <div className="grid three">
              <input name="name" placeholder="姓名 / 显示名称" required />
              <input name="username" placeholder="登录账号" required />
              <input name="password" placeholder="登录密码" required />
            </div>
            <div className="grid two">
              <select name="role" defaultValue={UserRole.WAREHOUSE_OPERATOR}>
                <option value={UserRole.WAREHOUSE_OPERATOR}>仓库操作员</option>
                <option value={UserRole.ADMIN}>管理员</option>
              </select>
              <div
                style={{
                  minHeight: "56px",
                  display: "flex",
                  alignItems: "center",
                  padding: "0 1rem",
                  borderRadius: "20px",
                  border: "1px solid rgba(219, 234, 254, 0.9)",
                  color: "var(--muted)"
                }}
              >
                仅创建内部账号，不关联客户钱包与客户数据。
              </div>
            </div>
            <div className="toolbar">
              <button type="submit">创建内部账号</button>
              <span className="muted">新账号创建后即可直接通过登录页进入对应端口。</span>
            </div>
          </form>
        </section>

        <section className="card soft" style={sectionStyle}>
          <div className="section-head">
            <div>
              <h3>管理端账号</h3>
              <p className="muted">可进入后台总览、客户、财务和异常页面。</p>
            </div>
            <span className="pill info">{adminUsers.length} 个账号</span>
          </div>
          <div className="dashboard-grid">
            {adminUsers.length > 0 ? adminUsers.map(renderUserCard) : <div className="muted">当前没有管理端账号。</div>}
          </div>
        </section>

        <section className="card soft" style={sectionStyle}>
          <div className="section-head">
            <div>
              <h3>仓库端账号</h3>
              <p className="muted">用于扫码台、异常历史和仓库现场操作。</p>
            </div>
            <span className="pill success">{warehouseUsers.length} 个账号</span>
          </div>
          <div className="dashboard-grid">
            {warehouseUsers.length > 0 ? (
              warehouseUsers.map(renderUserCard)
            ) : (
              <div className="muted">当前没有仓库端账号。</div>
            )}
          </div>
        </section>
      </div>
    </Shell>
  );
}
