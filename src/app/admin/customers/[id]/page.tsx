import { UserRole } from "@prisma/client";
import Link from "next/link";
import { ArrowUpRight, Building2, KeyRound, ShieldCheck, TimerReset, UserRound } from "lucide-react";
import { Shell } from "@/components/layout";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate, formatMoney, formatStatusLabel, getStatusTone } from "@/lib/utils";
import {
  createCustomerApiKeyAction,
  revokeCustomerApiKeyAction,
  toggleCustomerApiKeyAction
} from "@/server/actions";

export default async function AdminCustomerDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ apiKey?: string; prefix?: string }>;
}) {
  const session = await requireRole([UserRole.ADMIN]);
  const { id } = await params;
  const query = await searchParams;

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      billingPlans: {
        orderBy: { effectiveAt: "desc" },
        take: 6
      },
      apiKeys: {
        include: {
          createdByUser: true,
          revokedByUser: true,
          scopes: true
        },
        orderBy: { createdAt: "desc" }
      }
    }
  });

  if (!customer) {
    throw new Error("客户不存在");
  }

  const activeApiKeys = customer.apiKeys.filter((apiKey) => apiKey.enabled && !apiKey.revokedAt).length;
  const revokedApiKeys = customer.apiKeys.filter((apiKey) => apiKey.revokedAt).length;
  const activeBillingPlan =
    customer.billingPlans.find((plan) => plan.enabled && plan.effectiveAt <= new Date()) ?? customer.billingPlans[0] ?? null;
  const scopeLabel = (scope: string) => scope.toLowerCase().replaceAll("_", ":");

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
              <span className="pill">Customer Access</span>
              <h2>{customer.companyName}</h2>
              <p className="muted">客户 API Key 详情、权限范围与启停状态管理，现在和 admin 其他页面统一成同一套大圆角白色业务模板。</p>
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
              <div className="admin-overview-side-label">客户状态</div>
              <strong>{formatStatusLabel(customer.status)}</strong>
              <span className="muted">{customer.contactName} / {customer.code}</span>
            </div>
          </div>
        </section>

        <div className="summary-grid">
          <div className="summary-box" style={summaryStyle}>
            API Key 总数
            <strong>{customer.apiKeys.length}</strong>
          </div>
          <div className="summary-box" style={summaryStyle}>
            当前启用
            <strong>{activeApiKeys}</strong>
          </div>
          <div className="summary-box" style={summaryStyle}>
            已作废
            <strong>{revokedApiKeys}</strong>
          </div>
          <div className="summary-box" style={summaryStyle}>
            当前计费
            <strong>{activeBillingPlan ? formatStatusLabel(activeBillingPlan.mode) : "未配置"}</strong>
          </div>
          <div className="summary-box" style={summaryStyle}>
            当前报价
            <strong>
              {activeBillingPlan
                ? formatMoney(activeBillingPlan.unitPrice.toString(), activeBillingPlan.currency)
                : "未配置"}
            </strong>
          </div>
          <div className="summary-box" style={summaryStyle}>
            客户端入口
            <strong>可预览</strong>
            <Link href={`/admin/customers/${customer.id}/workspace`} className="muted">
              进入客户界面
            </Link>
          </div>
        </div>

        {query.apiKey ? (
          <div className="card soft key-reveal" style={sectionStyle}>
            <div className="section-head">
              <div>
                <h3>新 API Key</h3>
                <p className="success">该 Key 只展示这一次，请立即保存。</p>
              </div>
            </div>
            <code className="code-block">{query.apiKey}</code>
            <p className="muted">前缀：{query.prefix}</p>
          </div>
        ) : null}

        <div className="grid two">
          <div className="card soft filter-card" style={sectionStyle}>
            <div className="section-head">
              <div>
                <h3>创建新 Key</h3>
                <p className="muted">创建后会立即生成一次性明文，请按环境和用途命名。</p>
              </div>
            </div>
            <form action={createCustomerApiKeyAction} className="stacked">
              <input type="hidden" name="customerId" value={customer.id} />
              <input name="name" placeholder="Key 名称，例如 ERP 生产环境" required />
              <div className="grid two">
                <input name="expiresAt" type="datetime-local" />
                <input name="rateLimitPerMinute" type="number" min={1} defaultValue={60} placeholder="每分钟限流" />
              </div>
              <div className="box-editor">
                <strong>权限范围</strong>
                <div className="checkbox-grid">
                  <label><input type="checkbox" name="scopes" value="FORECAST_CREATE" defaultChecked />forecast:create</label>
                  <label><input type="checkbox" name="scopes" value="FORECAST_READ" defaultChecked />forecast:read</label>
                  <label><input type="checkbox" name="scopes" value="BOX_READ" defaultChecked />box:read</label>
                  <label><input type="checkbox" name="scopes" value="WALLET_READ" defaultChecked />wallet:read</label>
                  <label><input type="checkbox" name="scopes" value="TRANSACTION_READ" defaultChecked />transaction:read</label>
                </div>
              </div>
              <textarea name="remarks" placeholder="备注" />
              <button type="submit">创建 API Key</button>
            </form>
          </div>

          <div className="card soft" style={sectionStyle}>
            <div className="section-head">
              <div>
                <h3>客户信息</h3>
                <p className="muted">展示基础资料和当前计费信息，方便和财务配置联动查看。</p>
              </div>
            </div>
            <div className="detail-list">
              <div className="detail-row">
                <span>联系人</span>
                <strong>{customer.contactName}</strong>
              </div>
            <div className="detail-row">
              <span>状态</span>
              <strong>{formatStatusLabel(customer.status)}</strong>
            </div>
              <div className="detail-row">
                <span>客户编码</span>
                <strong>{customer.code}</strong>
              </div>
              <div className="detail-row">
                <span>备注</span>
                <strong>{customer.remarks || "-"}</strong>
              </div>
              <div className="detail-row">
                <span>计费方式</span>
                <strong>{activeBillingPlan ? formatStatusLabel(activeBillingPlan.mode) : "未配置"}</strong>
              </div>
              <div className="detail-row">
                <span>当前报价</span>
                <strong>
                  {activeBillingPlan
                    ? `${formatMoney(activeBillingPlan.unitPrice.toString(), activeBillingPlan.currency)} / 生效于 ${formatDate(activeBillingPlan.effectiveAt)}`
                    : "请去财务页配置"}
                </strong>
              </div>
            </div>
          </div>
        </div>

        <div className="card soft" style={sectionStyle}>
          <div className="section-head">
            <div>
              <h3>计费方案</h3>
              <p className="muted">客户按箱还是按件收费、当前单价和最近配置历史都在这里看。</p>
            </div>
            <Link href="/admin/finance" className="button-link secondary">
              去财务页配置报价
            </Link>
          </div>
          {customer.billingPlans.length > 0 ? (
            <div className="timeline-list">
              {customer.billingPlans.map((plan) => (
                <article key={plan.id} className="timeline-item">
                  <div className="timeline-title-row">
                    <strong>{formatStatusLabel(plan.mode)}</strong>
                    <span className={`pill ${plan.enabled ? "success" : "danger"}`}>
                      {plan.enabled ? "启用中" : "已停用"}
                    </span>
                  </div>
                  <div className="timeline-cluster">
                    <span className="timeline-chip">{formatMoney(plan.unitPrice.toString(), plan.currency)}</span>
                    <span className="timeline-chip">生效 {formatDate(plan.effectiveAt)}</span>
                  </div>
                  <div className="timeline-note">{plan.remarks || "无备注"}</div>
                </article>
              ))}
            </div>
          ) : (
            <div className="muted">当前客户还没有配置计费方案。</div>
          )}
        </div>

        <div className="card soft" style={sectionStyle}>
          <div className="section-head">
            <div>
              <h3>全部 API Key</h3>
              <p className="muted">包含权限范围、限流配置、创建信息与启停操作。</p>
            </div>
            <div className="muted">共 {customer.apiKeys.length} 个</div>
          </div>
          <div className="timeline-list">
            {customer.apiKeys.length > 0 ? (
              customer.apiKeys.map((apiKey) => (
                <article key={apiKey.id} className="timeline-item">
                  <div className="timeline-title-row">
                    <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                      <div className="sidebar-profile-avatar">
                        <KeyRound size={18} strokeWidth={2} />
                      </div>
                      <div>
                        <strong>{apiKey.name}</strong>
                        <div className="muted">{apiKey.remarks || "无备注"}</div>
                      </div>
                    </div>
                    <span className={`pill ${apiKey.enabled && !apiKey.revokedAt ? "success" : "danger"}`}>
                      {apiKey.enabled && !apiKey.revokedAt ? "启用" : "停用 / 作废"}
                    </span>
                  </div>

                  <div className="timeline-cluster">
                    <span className="timeline-chip">
                      <ShieldCheck size={14} strokeWidth={2} />
                      前缀 {apiKey.keyPrefix}
                    </span>
                    <span className="timeline-chip">
                      <TimerReset size={14} strokeWidth={2} />
                      限流 {apiKey.rateLimitPerMinute}/分钟
                    </span>
                    <span className={`timeline-chip ${getStatusTone(customer.status)}`}>
                      <Building2 size={14} strokeWidth={2} />
                      {formatStatusLabel(customer.status)}
                    </span>
                  </div>

                  <div className="timeline-note">
                    <div className="detail-row">
                      <strong>权限范围</strong>
                      <span>{apiKey.scopes.map((item) => scopeLabel(item.scope)).join(" / ") || "-"}</span>
                    </div>
                    <div className="detail-row">
                      <strong>使用信息</strong>
                      <span>
                        过期 {formatDate(apiKey.expiresAt)} / 最后使用 {formatDate(apiKey.lastUsedAt)}
                      </span>
                    </div>
                    <div className="detail-row">
                      <strong>创建信息</strong>
                      <span>
                        创建人 {apiKey.createdByUser?.name || "-"} / 创建时间 {formatDate(apiKey.createdAt)}
                        {apiKey.revokedByUser ? ` / 作废人 ${apiKey.revokedByUser.name || "-"}` : ""}
                      </span>
                    </div>
                  </div>

                  <div className="timeline-actions">
                    {!apiKey.revokedAt ? (
                      <form action={toggleCustomerApiKeyAction}>
                        <input type="hidden" name="customerId" value={customer.id} />
                        <input type="hidden" name="apiKeyId" value={apiKey.id} />
                        <input type="hidden" name="enabled" value={apiKey.enabled ? "false" : "true"} />
                        <button type="submit" className="secondary">{apiKey.enabled ? "禁用" : "启用"}</button>
                      </form>
                    ) : (
                      <span className="muted">已作废不可启用</span>
                    )}

                    {!apiKey.revokedAt ? (
                      <form action={revokeCustomerApiKeyAction}>
                        <input type="hidden" name="customerId" value={customer.id} />
                        <input type="hidden" name="apiKeyId" value={apiKey.id} />
                        <button type="submit">作废</button>
                      </form>
                    ) : (
                      <span className="muted">已作废</span>
                    )}
                  </div>
                </article>
              ))
            ) : (
              <div className="muted">当前客户还没有 API Key。</div>
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}
