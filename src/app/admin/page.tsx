import Link from "next/link";
import { UserRole } from "@prisma/client";
import { ArrowRight } from "lucide-react";
import { Shell } from "@/components/layout";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/utils";

export default async function AdminPage() {
  const session = await requireRole([UserRole.ADMIN]);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    totalCustomers,
    latestCustomers,
    channels,
    pendingRechargeRequests,
    todayChargeAggregate,
    todayRechargeAggregate,
    todayForecastCount,
    todayBoxCount,
    trackingCount,
    walletAlerts,
    exceptionBoxes
  ] = await Promise.all([
    prisma.customer.count(),
    prisma.customer.findMany({
      include: { apiKeys: true },
      orderBy: { createdAt: "desc" },
      take: 3
    }),
    prisma.channel.findMany({ orderBy: [{ sortOrder: "asc" }, { code: "asc" }] }),
    prisma.rechargeRequest.findMany({
      where: { status: "PENDING" },
      include: { customer: true },
      orderBy: { createdAt: "desc" },
      take: 3
    }),
    prisma.walletTransaction.aggregate({
      where: {
        createdAt: { gte: todayStart },
        type: { in: ["BOX_CHARGE", "ITEM_CHARGE"] }
      },
      _sum: { amount: true }
    }),
    prisma.rechargeRequest.aggregate({
      where: {
        createdAt: { gte: todayStart },
        status: "APPROVED"
      },
      _sum: { amount: true }
    }),
    prisma.forecast.count({
      where: { createdAt: { gte: todayStart } }
    }),
    prisma.forecastBox.count({
      where: { scannedAt: { gte: todayStart } }
    }),
    prisma.trackingScanRecord.count({
      where: { scannedAt: { gte: todayStart } }
    }),
    prisma.wallet.findMany({
      where: { balance: { lt: 100 } },
      include: { customer: true },
      orderBy: { balance: "asc" },
      take: 4
    }),
    prisma.forecastBox.findMany({
      where: { status: "EXCEPTION" },
      include: {
        forecast: { include: { customer: true } },
        trackingScans: true
      },
      orderBy: { scannedAt: "desc" },
      take: 4
    })
  ]);

  const todayCharge = Math.abs(Number(todayChargeAggregate._sum.amount ?? 0));
  const todayRecharge = Number(todayRechargeAggregate._sum.amount ?? 0);
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
    position: "relative" as const,
    overflow: "hidden" as const,
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
  const iconCircleStyle = {
    width: "58px",
    height: "58px",
    borderRadius: "999px",
    display: "grid",
    placeItems: "center",
    background: "linear-gradient(135deg, color-mix(in srgb, var(--brand) 24%, transparent), color-mix(in srgb, var(--accent) 22%, transparent))",
    color: "var(--brand-dark)",
    fontSize: "1rem",
    fontWeight: 700,
    boxShadow: "inset 0 1px 0 var(--glass-highlight)"
  };

  const statItems = [
    { label: "客户总数", value: `${totalCustomers}`, note: `最近新增 ${latestCustomers.length} 个在视图中` },
    { label: "今日预报", value: `${todayForecastCount}`, note: "用于判断当天入库压力" },
    { label: "今日收货", value: `${todayBoxCount} 箱`, note: `${trackingCount} 件完成扫描` },
    { label: "待审核充值", value: `${pendingRechargeRequests.length}`, note: "优先处理影响余额使用" },
    { label: "余额预警", value: `${walletAlerts.length}`, note: "余额低于 100 的客户" },
    { label: "异常箱", value: `${exceptionBoxes.length}`, note: "需要回到异常页继续跟进" },
    { label: "今日扣费", value: formatMoney(todayCharge.toString(), "USD"), note: "仅统计今日箱费与件费" },
    { label: "今日入账", value: formatMoney(todayRecharge.toString(), "USD"), note: "已审核通过的充值" }
  ];

  return (
    <Shell session={session}>
      <div className="page-stack" style={pageShellStyle}>
        <section className="card soft admin-overview-hero" style={heroStyle}>
          <div
            style={{
              position: "absolute",
              inset: "14px auto auto 14px",
              width: "120px",
              height: "120px",
              borderRadius: "30px",
              background: "rgba(219, 234, 254, 0.35)",
              filter: "blur(6px)"
            }}
          />
          <div className="section-head" style={{ position: "relative" }}>
            <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
              <div style={iconCircleStyle}>AD</div>
              <div>
                <span className="pill">后台总览</span>
                <h2>后台总览</h2>
                <p className="muted">只保留今天最需要判断和触达的信息。</p>
              </div>
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
              <div className="admin-overview-side-label">今日节奏</div>
              <strong>{todayForecastCount} 个预报 / {todayBoxCount} 箱入库</strong>
              <span className="muted">{trackingCount} 件已扫描</span>
            </div>
          </div>
        </section>

        <section className="stats">
          {statItems.map((item) => (
            <div key={item.label} className="stat" style={cardStyle}>
              {item.label}
              <strong>{item.value}</strong>
              <span className="muted">{item.note}</span>
            </div>
          ))}
        </section>

        <section className="card soft stacked" style={sectionStyle}>
          <div className="section-head">
            <div>
              <h3>快捷入口</h3>
              <p className="muted">首页只做导航和摘要，不再展开重表格。</p>
            </div>
          </div>
          <div className="action-grid">
            <div className="action-card" style={cardStyle}>
              <h4>异常处理</h4>
              <p className="muted">异常箱、补扫和历史记录入口。</p>
              <div className="link-list">
                <Link href="/admin/exceptions" className="quick-link">
                  <div className="quick-link-copy">
                    <strong>进入异常历史</strong>
                    <span className="muted">查看异常箱、处理记录和附件。</span>
                  </div>
                  <span className="quick-link-cta">
                    立即进入
                    <ArrowRight size={15} strokeWidth={2} />
                  </span>
                </Link>
                <Link href="/warehouse" className="quick-link">
                  <div className="quick-link-copy">
                    <strong>打开仓库操作端</strong>
                    <span className="muted">进入连续扫码和异常处理工作台。</span>
                  </div>
                  <span className="quick-link-cta">
                    打开工作台
                    <ArrowRight size={15} strokeWidth={2} />
                  </span>
                </Link>
              </div>
            </div>
            <div className="action-card" style={cardStyle}>
              <h4>财务与归档</h4>
              <p className="muted">报价、审核、流水、报表和归档分别独立处理。</p>
              <div className="link-list">
                <Link href="/admin/statements" className="quick-link">
                  <div className="quick-link-copy">
                    <strong>客户对账单</strong>
                    <span className="muted">查看客户账单与区间导出。</span>
                  </div>
                  <span className="quick-link-cta">
                    进入对账
                    <ArrowRight size={15} strokeWidth={2} />
                  </span>
                </Link>
                <Link href="/admin/finance" className="quick-link">
                  <div className="quick-link-copy">
                    <strong>客户报价中心</strong>
                    <span className="muted">设置客户按箱或按件报价。</span>
                  </div>
                  <span className="quick-link-cta">
                    配置报价
                    <ArrowRight size={15} strokeWidth={2} />
                  </span>
                </Link>
                <Link href="/admin/recharges" className="quick-link">
                  <div className="quick-link-copy">
                    <strong>充值审核</strong>
                    <span className="muted">处理客户充值申请并确认入账。</span>
                  </div>
                  <span className="quick-link-cta">
                    去审核
                    <ArrowRight size={15} strokeWidth={2} />
                  </span>
                </Link>
                <Link href="/admin/transactions" className="quick-link">
                  <div className="quick-link-copy">
                    <strong>资金流水</strong>
                    <span className="muted">查看扣费、充值和冲正明细。</span>
                  </div>
                  <span className="quick-link-cta">
                    查看流水
                    <ArrowRight size={15} strokeWidth={2} />
                  </span>
                </Link>
                <Link href="/admin/reports" className="quick-link">
                  <div className="quick-link-copy">
                    <strong>财务报表</strong>
                    <span className="muted">查看日报、月报和汇总表现。</span>
                  </div>
                  <span className="quick-link-cta">
                    打开报表
                    <ArrowRight size={15} strokeWidth={2} />
                  </span>
                </Link>
                <Link href="/admin/archives" className="quick-link">
                  <div className="quick-link-copy">
                    <strong>财务归档中心</strong>
                    <span className="muted">统一管理 PDF 与 CSV 归档文件。</span>
                  </div>
                  <span className="quick-link-cta">
                    查看归档
                    <ArrowRight size={15} strokeWidth={2} />
                  </span>
                </Link>
              </div>
            </div>
            <div className="action-card" style={cardStyle}>
              <h4>客户追踪</h4>
              <p className="muted">客户新增与启用情况。</p>
              <div className="link-list">
                <Link href="/admin/customers" className="quick-link">
                  <div className="quick-link-copy">
                    <strong>打开客户列表</strong>
                    <span className="muted">进入客户详情、开户和状态管理。</span>
                  </div>
                  <span className="quick-link-cta">
                    进入列表
                    <ArrowRight size={15} strokeWidth={2} />
                  </span>
                </Link>
              </div>
              <div className="compact-list">
                {latestCustomers.length === 0 ? (
                  <div className="muted">暂无客户记录。</div>
                ) : (
                  latestCustomers.map((customer) => (
                    <Link key={customer.id} href={`/admin/customers/${customer.id}`} className="compact-item" style={cardStyle}>
                      <strong>{customer.companyName}</strong>
                      <span className="muted">
                        {customer.contactName} / API Key {customer.apiKeys.length} 个
                      </span>
                    </Link>
                  ))
                )}
              </div>
            </div>
            <div className="action-card" style={cardStyle}>
              <h4>运营快照</h4>
              <p className="muted">这里只保留当日渠道、预警和异常快照。</p>
              <div className="compact-list">
                <div className="compact-item" style={cardStyle}>
                  <strong>启用渠道</strong>
                  <span className="muted">{channels.map((item) => item.code).join(" / ") || "暂无渠道"}</span>
                </div>
                <div className="compact-item" style={cardStyle}>
                  <strong>余额预警</strong>
                  <span className="muted">{walletAlerts.length} 个客户需要提醒充值</span>
                </div>
                <div className="compact-item" style={cardStyle}>
                  <strong>异常箱</strong>
                  <span className="muted">{exceptionBoxes.length} 个待继续跟进</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="split-grid">
          <section className="card soft stacked" style={sectionStyle}>
            <div className="section-head">
              <div>
                <h3>待处理事项</h3>
                <p className="muted">只保留今天需要尽快决策的几类事项。</p>
              </div>
            </div>

            <div className="admin-task-group">
              <div className="row-between">
                <strong>充值审核</strong>
                <Link href="/admin/recharges" className="button-link secondary">
                  进入审核页
                  <ArrowRight size={16} strokeWidth={2} />
                </Link>
              </div>
              <div className="compact-list">
                <div className="compact-item" style={cardStyle}>
                  <strong>待审核数量</strong>
                  <span className="muted">{pendingRechargeRequests.length} 条申请待处理</span>
                </div>
              </div>
            </div>

            <div className="admin-task-group">
              <div className="row-between">
                <strong>异常箱</strong>
                <Link href="/admin/exceptions" className="button-link warning">
                  进入异常页
                  <ArrowRight size={16} strokeWidth={2} />
                </Link>
              </div>
              {exceptionBoxes.length === 0 ? (
                <div className="muted">当前没有异常箱。</div>
              ) : (
                <div className="compact-list">
                  {exceptionBoxes.map((box) => (
                    <div key={box.id} className="compact-item" style={cardStyle}>
                      <strong>{box.forecast.customer.companyName} / {box.boxNo}</strong>
                      <span className="muted">
                        {box.anomalyType} / 预报 {box.expectedOrderCount} / 实扫 {box.trackingScans.filter((item) => !item.isDuplicate).length}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="admin-task-group">
              <div className="row-between">
                <strong>余额预警</strong>
                <span className="muted">建议尽快提醒充值</span>
              </div>
              {walletAlerts.length === 0 ? (
                <div className="muted">当前没有余额预警客户。</div>
              ) : (
                <div className="compact-list">
                  {walletAlerts.map((wallet) => (
                    <div key={wallet.id} className="compact-item" style={cardStyle}>
                      <strong>{wallet.customer.companyName}</strong>
                      <span className="muted">{formatMoney(wallet.balance.toString(), wallet.currency)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="card soft stacked" style={sectionStyle}>
            <div className="section-head">
              <div>
                <h3>轻量快速操作</h3>
                <p className="muted">后台首页只保留轻量动作和路由，不再承载开户与大块财务操作。</p>
              </div>
            </div>

            <div className="compact-item" style={cardStyle}>
              <strong>客户报价配置</strong>
              <span className="muted">报价配置已经单独拆到客户报价中心，首页不再混入。</span>
              <Link href="/admin/finance" className="button-link">
                进入报价中心
                <ArrowRight size={16} strokeWidth={2} />
              </Link>
            </div>

            <div className="compact-item" style={cardStyle}>
              <strong>充值审核</strong>
              <span className="muted">审核与历史已经拆到独立页面，不再塞进首页面板。</span>
              <Link href="/admin/recharges" className="button-link warning">
                进入审核页
                <ArrowRight size={16} strokeWidth={2} />
              </Link>
            </div>

            <div className="compact-item" style={cardStyle}>
              <strong>资金流水</strong>
              <span className="muted">流水查看和冲正已经拆到独立页面，避免和报价、审核混在一起。</span>
              <Link href="/admin/transactions" className="button-link">
                进入流水页
                <ArrowRight size={16} strokeWidth={2} />
              </Link>
            </div>

            <div className="compact-item" style={cardStyle}>
              <strong>客户开户</strong>
              <span className="muted">客户开户表单已经收回客户列表页，后台首页不再重复承载。</span>
              <Link href="/admin/customers" className="button-link secondary">
                去客户列表
                <ArrowRight size={16} strokeWidth={2} />
              </Link>
            </div>
          </section>
        </div>
      </div>
    </Shell>
  );
}
