import Link from "next/link";
import { ArrowUpRight, Boxes, CreditCard, ReceiptText, Wallet } from "lucide-react";
import { CustomerForecastForm } from "@/components/customer-forecast-form";
import { formatDate, formatMoney, formatStatusLabel, getStatusTone } from "@/lib/utils";
import type { getCustomerWorkspaceData } from "@/services/customer-workspace-service";

type CustomerWorkspaceData = Awaited<ReturnType<typeof getCustomerWorkspaceData>>;

export function CustomerWorkspaceView({
  data,
  mode,
  forecastAction,
  rechargeAction,
  statementHref
}: {
  data: CustomerWorkspaceData;
  mode: "customer" | "admin-preview";
  forecastAction?: (formData: FormData) => Promise<void>;
  rechargeAction?: (formData: FormData) => Promise<void>;
  statementHref: string;
}) {
  const { customer, channels, forecasts, wallet, recharges, transactions } = data;

  const pageShellStyle = {
    ["--card" as string]: "var(--card-strong)",
    ["--shadow" as string]: "var(--shadow)",
    padding: "1rem",
    borderRadius: "32px",
    background: "var(--surface-2)",
    border: "1px solid var(--glass-border)",
    boxShadow: "var(--shadow-soft)"
  };
  const heroStyle = {
    borderRadius: "34px",
    padding: "1.6rem",
    border: "1px solid var(--glass-border)",
    background: "var(--surface-1)",
    boxShadow: "var(--shadow)"
  };
  const sectionStyle = {
    borderRadius: "28px",
    padding: "1.25rem",
    border: "1px solid var(--glass-border)",
    background: "var(--surface-1)",
    boxShadow: "var(--shadow-soft)"
  };
  const cardStyle = {
    borderRadius: "24px",
    border: "1px solid var(--glass-border)",
    background: "var(--surface-2)",
    boxShadow: "var(--shadow-soft)"
  };

  const statItems = [
    {
      label: "当前余额",
      value: formatMoney(wallet?.balance.toString() || 0, wallet?.currency || "USD"),
      note: `默认钱包币种 ${wallet?.currency || "USD"}`
    },
    { label: "预报数", value: `${forecasts.length}`, note: "按创建时间倒序展示" },
    {
      label: "待审核充值",
      value: `${recharges.filter((item) => item.status === "PENDING").length}`,
      note: "等待后台确认入账"
    },
    { label: "最近流水", value: `${transactions.length}`, note: "首页保留最近 20 条" }
  ];

  const isPreview = mode === "admin-preview";

  return (
    <div className="page-stack" style={pageShellStyle}>
      <section className="card soft" style={heroStyle}>
        <div className="section-head">
          <div>
            <span className="pill">{isPreview ? "客户界面预览" : "客户工作台"}</span>
            <h2>{isPreview ? `${customer.companyName} 客户端预览` : "客户端工作台"}</h2>
            <p className="muted">
              {isPreview
                ? "管理员以只读方式查看该客户的工作台数据与布局，方便从后台直接进入对应客户端界面。"
                : "把预报创建、充值申请、账务查询和标签导出收敛到同一套轻量界面里，和 admin 端共用相同的大圆角白色业务壳。"}
            </p>
          </div>
          <div
            className="admin-overview-side"
            style={{
              minWidth: "240px",
              borderRadius: "24px",
              border: "1px solid var(--glass-border)",
              background:
                "linear-gradient(180deg, color-mix(in srgb, var(--brand) 12%, var(--panel-strong)), color-mix(in srgb, var(--accent) 10%, var(--panel)))"
            }}
          >
            <div className="admin-overview-side-label">{isPreview ? "预览客户" : "当前钱包"}</div>
            <strong>{isPreview ? customer.companyName : formatMoney(wallet?.balance.toString() || 0, wallet?.currency || "USD")}</strong>
            <span className="muted">
              {isPreview ? `${customer.contactName} / ${customer.code}` : `最近展示 ${transactions.length} 条流水`}
            </span>
          </div>
        </div>
      </section>

      <section className="stats" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
        {statItems.map((item) => (
          <div key={item.label} className="stat" style={cardStyle}>
            {item.label}
            <strong>{item.value}</strong>
            <span className="muted">{item.note}</span>
          </div>
        ))}
      </section>

      <div className="split-grid">
        {isPreview ? (
          <>
            <section className="card soft stacked" style={sectionStyle}>
              <div className="section-head">
                <div>
                  <h3>客户资料</h3>
                  <p className="muted">从管理端进入时，先展示客户身份、状态和当前可用渠道。</p>
                </div>
              </div>
              <div className="detail-list">
                <div className="detail-row">
                  <span>公司名</span>
                  <strong>{customer.companyName}</strong>
                </div>
                <div className="detail-row">
                  <span>联系人</span>
                  <strong>{customer.contactName}</strong>
                </div>
                <div className="detail-row">
                  <span>客户编码</span>
                  <strong>{customer.code}</strong>
                </div>
                <div className="detail-row">
                  <span>客户状态</span>
                  <strong>{customer.status}</strong>
                </div>
                <div className="detail-row">
                  <span>启用渠道</span>
                  <strong>{channels.map((item) => item.code).join(" / ") || "-"}</strong>
                </div>
              </div>
            </section>

            <section className="card soft stacked" style={sectionStyle}>
              <div className="section-head">
                <div>
                  <h3>预览说明</h3>
                  <p className="muted">这里保持和客户端一致的视觉结构，但不直接代客户提交数据。</p>
                </div>
              </div>
              <div className="compact-list">
                <div className="compact-item" style={cardStyle}>
                  <strong>预报创建</strong>
                  <span className="muted">当前为只读预览，避免管理员误以客户身份提交预报。</span>
                </div>
                <div className="compact-item" style={cardStyle}>
                  <strong>充值申请</strong>
                  <span className="muted">可在下方查看客户历史申请、附件和审核状态。</span>
                </div>
                <div className="compact-item" style={cardStyle}>
                  <strong>账单入口</strong>
                  <a href={statementHref} className="muted">
                    打开该客户账单预览
                  </a>
                </div>
              </div>
            </section>
          </>
        ) : (
          <>
            <div style={sectionStyle}>
              <CustomerForecastForm channels={channels} action={forecastAction!} />
            </div>

            <form action={rechargeAction!} className="card soft stacked" style={sectionStyle}>
              <div className="section-head">
                <div>
                  <h3>提交充值申请</h3>
                  <p className="muted">提交支付渠道、金额和附件，进入人工审核流程。</p>
                </div>
              </div>
              <input name="paymentChannel" placeholder="支付渠道，例如 Bank / PayPal" required />
              <div className="grid two">
                <input name="amount" type="number" step="0.01" placeholder="金额" required />
                <input name="currency" placeholder="币种" defaultValue="USD" required />
              </div>
              <input
                name="attachment"
                type="file"
                accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
              />
              <textarea name="remarks" placeholder="备注" />
              <div className="toolbar">
                <button type="submit">提交审核</button>
                <span className="muted">支持 jpg、jpeg、png、pdf，单文件不超过 10MB。</span>
              </div>
            </form>
          </>
        )}
      </div>

      <section className="card soft" style={sectionStyle}>
        <div className="section-head">
          <div>
            <h3>预报列表</h3>
            <p className="muted">用时间线代替传统表格，保留箱唛导出、单箱导出和渠道信息。</p>
          </div>
        </div>
        <div className="timeline-list">
          {forecasts.map((forecast) => (
            <article key={forecast.id} className="timeline-item">
              <div className="timeline-title-row">
                <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                  <div className="sidebar-profile-avatar">
                    <Boxes size={18} strokeWidth={2} />
                  </div>
                  <div>
                    <strong>{forecast.forecastNo}</strong>
                    <div className="muted">{formatDate(forecast.createdAt)}</div>
                  </div>
                </div>
                <span className={`pill ${getStatusTone(forecast.status)}`}>{formatStatusLabel(forecast.status)}</span>
              </div>

              <div className="timeline-cluster">
                <span className="timeline-chip">{forecast.totalBoxes} 箱</span>
                {forecast.boxes.map((box) => (
                  <span key={box.id} className="timeline-chip">
                    {box.boxNo} · {box.expectedOrderCount} 件
                  </span>
                ))}
              </div>

              <div className="timeline-note">
                {forecast.boxes.map((box) => (
                  <div key={box.id} className="detail-row">
                    <strong>{box.boxNo}</strong>
                    <span>
                      {box.boxSpec} / 渠道 {box.channels.map((item) => item.channel.code).join(", ") || "-"}
                    </span>
                  </div>
                ))}
              </div>

              <div className="timeline-actions">
                <a href={`/api/forecasts/${forecast.id}/labels?layout=a4`} target="_blank" className="button-link secondary">
                  A4 批量导出
                </a>
                <a
                  href={`/api/forecasts/${forecast.id}/labels?layout=thermal_100x150`}
                  target="_blank"
                  className="button-link secondary"
                >
                  热敏纸批量导出
                </a>
                {forecast.boxes[0] ? (
                  <a href={`/api/boxes/${forecast.boxes[0].id}/label?layout=single`} target="_blank" className="button-link">
                    单箱导出
                    <ArrowUpRight size={14} strokeWidth={2} />
                  </a>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="split-grid">
        <section className="card soft" style={sectionStyle}>
          <div className="section-head">
            <div>
              <h3>充值记录</h3>
              <p className="muted">展示申请状态、审核备注以及上传的付款附件。</p>
            </div>
          </div>
          <div className="timeline-list">
            {recharges.map((item) => (
              <article key={item.id} className="timeline-item">
                <div className="timeline-title-row">
                  <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                    <div className="sidebar-profile-avatar">
                      <CreditCard size={18} strokeWidth={2} />
                    </div>
                    <div>
                      <strong>{item.paymentChannel}</strong>
                      <div className="muted">{formatDate(item.createdAt)}</div>
                    </div>
                  </div>
                  <span className={`pill ${getStatusTone(item.status)}`}>{formatStatusLabel(item.status)}</span>
                </div>
                <div className="timeline-cluster">
                  <span className="timeline-chip">{formatMoney(item.amount.toString(), item.currency)}</span>
                  <span className="timeline-chip">{item.rejectReason || item.remarks || "无备注"}</span>
                </div>
                {item.attachment ? (
                  <div className="attachment-item">
                    <a href={`/api/files/${item.attachment.id}`} target="_blank" className="button-link secondary">
                      查看附件
                    </a>
                    {item.attachment.mimeType.startsWith("image/") ? (
                      <img
                        src={`/api/files/${item.attachment.id}`}
                        alt={item.attachment.originalFilename}
                        className="attachment-thumb"
                      />
                    ) : null}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </section>

        <section className="card soft" style={sectionStyle}>
          <div className="section-head">
            <div>
              <h3>钱包流水</h3>
              <p className="muted">快速查看最近交易类型、关联对象和余额变化。</p>
            </div>
            <a href={statementHref} className="muted">进入对账单</a>
          </div>
          <div className="timeline-list">
            {transactions.map((item) => (
              <article key={item.id} className="timeline-item">
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
                  <span>关联 {item.trackingNo || item.forecastBoxId || item.forecastId || "-"}</span>
                  <span>
                    {formatMoney(item.balanceBefore.toString(), item.currency)} {"->"}{" "}
                    {formatMoney(item.balanceAfter.toString(), item.currency)}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
