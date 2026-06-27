import type { Route } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { UserRole } from "@prisma/client";
import {
  ArrowRight,
  ArrowUpRight,
  BellDot,
  Boxes,
  Building2,
  ChartColumnBig,
  CircleAlert,
  CreditCard,
  FileStack,
  Layers3,
  PackageCheck,
  QrCode,
  ReceiptText,
  ScanLine,
  ShieldCheck,
  Wallet
} from "lucide-react";
import { Shell } from "@/components/layout";
import {
  WAREHOUSE_LOCALE_COOKIE,
  WarehouseText,
  type WarehouseLocale
} from "@/components/warehouse-locale";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatMoney, getStatusTone } from "@/lib/utils";

type TrendDatum = {
  label: string;
  value: number;
};

type DonutDatum = {
  label: string;
  value: number;
  color: string;
};

type PortalCardProps = {
  title: React.ReactNode;
  description: React.ReactNode;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  href?: Route;
  cta: React.ReactNode;
  eyebrow: React.ReactNode;
  stats: Array<{ label: React.ReactNode; value: React.ReactNode }>;
  active?: boolean;
  footerText?: React.ReactNode;
};

type SignalProps = {
  title: React.ReactNode;
  value: React.ReactNode;
  hint: React.ReactNode;
  tone: "SUCCESS" | "PENDING" | "EXCEPTION" | "VERIFYING";
};

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="card soft"
      style={{
        padding: "1rem 1.1rem",
        display: "grid",
        gap: "0.35rem",
        minHeight: "112px"
      }}
    >
      <span className="muted" style={{ fontSize: "0.78rem", letterSpacing: "0.04em", textTransform: "uppercase" }}>
        {label}
      </span>
      <strong style={{ fontSize: "1.6rem", lineHeight: 1.02 }}>{value}</strong>
    </div>
  );
}

function CapabilityCard({
  title,
  description,
  icon: Icon
}: {
  title: React.ReactNode;
  description: React.ReactNode;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
}) {
  return (
    <div
      className="card soft"
      style={{
        padding: "1.35rem",
        display: "grid",
        gap: "0.9rem",
        minHeight: "220px"
      }}
    >
      <div
        style={{
          width: "52px",
          height: "52px",
          borderRadius: "18px",
          display: "grid",
          placeItems: "center",
          background: "var(--surface-2)",
          border: "1px solid var(--glass-border)"
        }}
      >
        <Icon size={22} strokeWidth={2} />
      </div>
      <div style={{ display: "grid", gap: "0.45rem" }}>
        <strong style={{ fontSize: "1.05rem" }}>{title}</strong>
        <p className="muted" style={{ margin: 0, lineHeight: 1.65 }}>
          {description}
        </p>
      </div>
    </div>
  );
}

function PortalCard({
  title,
  description,
  icon: Icon,
  href,
  cta,
  eyebrow,
  stats,
  active,
  footerText
}: PortalCardProps) {
  const content = (
    <div
      className="card soft"
      style={{
        padding: "1.35rem",
        display: "grid",
        gap: "1rem",
        minHeight: "320px",
        background: active
          ? "linear-gradient(180deg, color-mix(in srgb, var(--brand) 12%, var(--panel-strong)), color-mix(in srgb, var(--panel) 90%, transparent))"
          : "var(--surface-1)",
        borderColor: active ? "color-mix(in srgb, var(--brand) 32%, transparent)" : undefined
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
        <div
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "20px",
            display: "grid",
            placeItems: "center",
            background: active ? "color-mix(in srgb, var(--brand) 14%, transparent)" : "var(--surface-2)",
            border: "1px solid var(--glass-border)"
          }}
        >
          <Icon size={24} strokeWidth={2} />
        </div>
        <span className={active ? "status-chip info" : "status-chip"}>{eyebrow}</span>
      </div>

      <div style={{ display: "grid", gap: "0.55rem" }}>
        <strong style={{ fontSize: "1.24rem", lineHeight: 1.1 }}>{title}</strong>
        <p className="muted" style={{ margin: 0, lineHeight: 1.7 }}>
          {description}
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: "0.75rem"
        }}
      >
        {stats.map((item, index) => (
          <div
            key={index}
            style={{
              borderRadius: "20px",
              padding: "0.9rem 1rem",
              background: "var(--surface-2)",
              border: "1px solid var(--glass-border)",
              display: "grid",
              gap: "0.28rem"
            }}
          >
            <span className="muted" style={{ fontSize: "0.8rem" }}>
              {item.label}
            </span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: "auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.8rem"
        }}
      >
        <span className="muted">{footerText ?? (active ? "当前角色可直接进入" : "展示统一工作流入口结构")}</span>
        <span className="button-link secondary" style={{ pointerEvents: "none" }}>
          {cta}
          <ArrowRight size={16} strokeWidth={2} />
        </span>
      </div>
    </div>
  );

  if (!href) {
    return content;
  }

  return (
    <Link href={href} style={{ display: "block" }}>
      {content}
    </Link>
  );
}

function SignalItem({ title, value, hint, tone }: SignalProps) {
  return (
    <div className="timeline-item">
      <div className="timeline-title-row">
        <strong>{title}</strong>
        <span className={`timeline-chip ${getStatusTone(tone)}`}>{value}</span>
      </div>
      <div className="timeline-note compact-copy">{hint}</div>
    </div>
  );
}

function buildRecentDays(totalDays: number) {
  const days: Array<{ key: string; label: string; date: Date }> = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let index = totalDays - 1; index >= 0; index -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - index);
    days.push({
      key: date.toISOString().slice(0, 10),
      label: new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric" }).format(date),
      date
    });
  }

  return days;
}

function AreaLineChart({
  data,
  stroke,
  fill
}: {
  data: TrendDatum[];
  stroke: string;
  fill: string;
}) {
  const width = 420;
  const height = 170;
  const paddingX = 12;
  const paddingTop = 14;
  const paddingBottom = 30;
  const maxValue = Math.max(...data.map((item) => item.value), 1);
  const stepX = data.length > 1 ? (width - paddingX * 2) / (data.length - 1) : 0;

  const points = data.map((item, index) => {
    const x = paddingX + stepX * index;
    const y = paddingTop + (height - paddingTop - paddingBottom) * (1 - item.value / maxValue);
    return { ...item, x, y };
  });

  const linePath = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const areaPath = `${linePath} L ${points.at(-1)?.x ?? paddingX} ${height - paddingBottom} L ${points[0]?.x ?? paddingX} ${height - paddingBottom} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "170px", overflow: "visible" }} aria-hidden="true">
      <defs>
        <linearGradient id={`area-${stroke.replace(/[^a-z0-9]/gi, "")}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={fill} stopOpacity="0.42" />
          <stop offset="100%" stopColor={fill} stopOpacity="0.03" />
        </linearGradient>
      </defs>
      {[0, 1, 2, 3].map((step) => {
        const y = paddingTop + ((height - paddingTop - paddingBottom) / 3) * step;
        return (
          <line
            key={step}
            x1={paddingX}
            x2={width - paddingX}
            y1={y}
            y2={y}
            stroke="rgba(148,163,184,0.18)"
            strokeDasharray="4 8"
          />
        );
      })}
      <path d={areaPath} fill={`url(#area-${stroke.replace(/[^a-z0-9]/gi, "")})`} />
      <path d={linePath} fill="none" stroke={stroke} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((point) => (
        <g key={point.label}>
          <circle cx={point.x} cy={point.y} r="4.5" fill="var(--panel-strong)" stroke={stroke} strokeWidth="2.4" />
          <text
            x={point.x}
            y={height - 8}
            textAnchor="middle"
            fontSize="11"
            fill="var(--muted)"
          >
            {point.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

function CandleFlowChart({
  data
}: {
  data: Array<{ label: string; positive: number; negative: number }>;
}) {
  const width = 420;
  const height = 170;
  const paddingX = 18;
  const baseline = height / 2;
  const candleWidth = 28;
  const gap = (width - paddingX * 2 - candleWidth * data.length) / Math.max(data.length - 1, 1);
  const maxValue = Math.max(...data.flatMap((item) => [item.positive, item.negative]), 1);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "170px", overflow: "visible" }} aria-hidden="true">
      <line x1={paddingX} x2={width - paddingX} y1={baseline} y2={baseline} stroke="rgba(148,163,184,0.24)" />
      {data.map((item, index) => {
        const x = paddingX + index * (candleWidth + gap);
        const posHeight = (item.positive / maxValue) * 54;
        const negHeight = (item.negative / maxValue) * 42;
        return (
          <g key={item.label}>
            <line
              x1={x + candleWidth / 2}
              x2={x + candleWidth / 2}
              y1={baseline - posHeight - 8}
              y2={baseline + negHeight + 8}
              stroke="rgba(148,163,184,0.3)"
              strokeWidth="2"
            />
            <rect
              x={x}
              y={baseline - posHeight}
              width={candleWidth}
              height={Math.max(posHeight, 6)}
              rx="10"
              fill="rgba(35,178,109,0.88)"
            />
            <rect
              x={x}
              y={baseline}
              width={candleWidth}
              height={Math.max(negHeight, 6)}
              rx="10"
              fill="rgba(255,138,76,0.88)"
            />
            <text
              x={x + candleWidth / 2}
              y={height - 8}
              textAnchor="middle"
              fontSize="11"
              fill="rgba(71,85,105,0.82)"
            >
              {item.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function DonutChart({ data }: { data: DonutDatum[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const gradient = total
    ? data
        .reduce<{ segments: string[]; offset: number }>(
          (accumulator, item) => {
            const start = accumulator.offset;
            const end = start + (item.value / total) * 100;
            accumulator.segments.push(`${item.color} ${start}% ${end}%`);
            accumulator.offset = end;
            return accumulator;
          },
          { segments: [], offset: 0 }
        )
        .segments.join(", ")
    : "rgba(226,232,240,0.9) 0% 100%";

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <div
          style={{
            width: "126px",
            height: "126px",
            borderRadius: "999px",
            background: `conic-gradient(${gradient})`,
            position: "relative",
            boxShadow: "inset 0 1px 0 var(--glass-highlight)"
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: "20px",
              borderRadius: "999px",
              background: "var(--surface-2)",
              display: "grid",
              placeItems: "center",
              textAlign: "center",
              color: "var(--brand-dark)"
            }}
          >
            <strong style={{ fontSize: "1.35rem" }}>{total}</strong>
            <span className="muted" style={{ fontSize: "0.76rem" }}>
              当前总量
            </span>
          </div>
        </div>
        <div style={{ display: "grid", gap: "0.7rem", flex: 1 }}>
          {data.map((item) => (
            <div key={item.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
                <span style={{ width: "10px", height: "10px", borderRadius: "999px", background: item.color }} />
                <span style={{ color: "#243247", fontWeight: 600 }}>{item.label}</span>
              </div>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HomeHero({
  sessionLabel,
  surfaceLabel,
  featureValue,
  featureLabel,
  featureNote,
  microStats,
  primaryHref,
  secondaryHref,
  primaryText,
  secondaryText
}: {
  sessionLabel: string;
  surfaceLabel: string;
  featureValue: string;
  featureLabel: string;
  featureNote: string;
  microStats: Array<{ label: string; value: string; tone?: "brand" | "accent" | "success" | "neutral" }>;
  primaryHref: Route;
  secondaryHref: Route;
  primaryText: string;
  secondaryText: string;
}) {
  const premiumValueMatch = featureValue.match(/^([A-Za-z$¥€£]{1,4})([\d,.\-]+)$/);

  return (
    <section
      className="card soft"
      style={{
        padding: "1.65rem",
        display: "grid",
        gap: "1.5rem",
        background: "var(--surface-1)"
      }}
    >
      <div className="hero-panel-grid">
        <div className="hero-intro-panel">
          <div className="hero-badges">
            <span className="pill">小包系统</span>
            <span className="status-chip info">{sessionLabel}</span>
            <span className="status-chip">统一工作台</span>
          </div>
          <div className="hero-signal-board">
            <div className="hero-signal-main">
              <div className="admin-overview-side-label">{surfaceLabel}</div>
              <div className="hero-signal-value">
                {premiumValueMatch ? (
                  <>
                    <span className="hero-signal-prefix">{premiumValueMatch[1]}</span>
                    <span className="hero-signal-amount">{premiumValueMatch[2]}</span>
                  </>
                ) : (
                  featureValue
                )}
              </div>
              <div className="hero-signal-label">{featureLabel}</div>
              <div className="hero-signal-note">{featureNote}</div>
            </div>
            <div className="hero-signal-grid">
              {microStats.map((item) => (
                <div key={item.label} className={`hero-signal-tile ${item.tone ?? "neutral"}`}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
            <div className="hero-signal-track" aria-hidden="true">
              <span className="brand" />
              <span className="accent" />
              <span className="success" />
              <span className="brand" />
              <span className="accent" />
            </div>
          </div>
          <div className="hero-floating-scene" aria-hidden="true">
            <div className="hero-floating-card hero-floating-card-primary">
              <div className="hero-floating-icon">
                <ChartColumnBig size={18} strokeWidth={2} />
              </div>
              <div className="hero-floating-copy">
                <strong>运营视图</strong>
                <span>客户 · 仓库 · 财务</span>
              </div>
              <div className="hero-signal-bars">
                <span />
                <span />
                <span />
              </div>
            </div>
            <div className="hero-floating-card hero-floating-card-secondary">
              <div className="hero-floating-icon">
                <ScanLine size={18} strokeWidth={2} />
              </div>
              <div className="hero-floating-copy">
                <strong>扫码节奏</strong>
                <span>实时作业 · 异常闭环</span>
              </div>
              <div className="hero-progress-line">
                <i />
              </div>
            </div>
            <div className="hero-floating-card hero-floating-card-tertiary">
              <div className="hero-floating-icon">
                <Wallet size={18} strokeWidth={2} />
              </div>
              <div className="hero-floating-copy">
                <strong>客户工作台</strong>
                <span>预报 · 箱唛 · 对账</span>
              </div>
            </div>
            <div className="hero-pulse-orb hero-pulse-orb-a" />
            <div className="hero-pulse-orb hero-pulse-orb-b" />
            <div className="hero-grid-glow" />
          </div>
          <div className="hero-action-row">
            <Link href={primaryHref} className="button-link">
              {primaryText}
              <ArrowUpRight size={16} strokeWidth={2} />
            </Link>
            <Link href={secondaryHref} className="button-link secondary">
              {secondaryText}
            </Link>
          </div>
        </div>

        <div className="focus-card hero-orbit-card">
          <div className="hero-orbit-header">
            <div>
              <div className="admin-overview-side-label">三端协同</div>
              <strong style={{ fontSize: "1.2rem" }}>同一套工作流在三端之间联动</strong>
            </div>
            <Layers3 size={22} strokeWidth={2} />
          </div>
          <div className="hero-orbit-stage" aria-hidden="true">
            <div className="hero-orbit-ring hero-orbit-ring-a" />
            <div className="hero-orbit-ring hero-orbit-ring-b" />
            <div className="hero-orbit-core">
              <span>WMS</span>
            </div>
            <div className="hero-orbit-node hero-orbit-node-a">
              <span>客户端</span>
              <small>预报 / 箱唛</small>
            </div>
            <div className="hero-orbit-node hero-orbit-node-b">
              <span>仓库端</span>
              <small>扫码 / 异常</small>
            </div>
            <div className="hero-orbit-node hero-orbit-node-c">
              <span>管理端</span>
              <small>客户 / 财务</small>
            </div>
            <div className="hero-orbit-glow hero-orbit-glow-a" />
            <div className="hero-orbit-glow hero-orbit-glow-b" />
          </div>
          <div className="hero-orbit-legend">
            <span className="timeline-chip info">客户端关注余额、预报和导出</span>
            <span className="timeline-chip warning">仓库端关注节奏、状态和异常</span>
            <span className="timeline-chip success">管理端关注客户、财务和总览</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export default async function HomePage() {
  const session = await requireSession();
  const cookieStore = await cookies();
  const warehouseLocaleCookie = cookieStore.get(WAREHOUSE_LOCALE_COOKIE)?.value;
  const initialWarehouseLocale: WarehouseLocale =
    warehouseLocaleCookie === "en" || warehouseLocaleCookie === "es" || warehouseLocaleCookie === "zh"
      ? warehouseLocaleCookie
      : "zh";

  if (session.role === UserRole.ADMIN) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const recentDays = buildRecentDays(7);
    const recentStart = new Date(recentDays[0]?.date ?? todayStart);
    recentStart.setHours(0, 0, 0, 0);

    const [totalCustomers, pendingRecharges, exceptionBoxes, totalBalanceAlert, recentBoxes, recentTransactions] = await Promise.all([
      prisma.customer.count(),
      prisma.rechargeRequest.count({ where: { status: "PENDING" } }),
      prisma.forecastBox.count({ where: { status: "EXCEPTION" } }),
      prisma.wallet.count({ where: { balance: { lt: 100 } } }),
      prisma.forecastBox.findMany({
        where: {
          scannedAt: { gte: recentStart }
        },
        select: {
          scannedAt: true,
          anomalyType: true,
          status: true
        }
      }),
      prisma.walletTransaction.findMany({
        where: {
          createdAt: { gte: recentStart },
          type: { in: ["RECHARGE", "BOX_CHARGE", "ITEM_CHARGE", "REVERSAL"] }
        },
        select: {
          createdAt: true,
          type: true,
          amount: true
        }
      })
    ]);

    const weekBoxes = recentBoxes.filter((item) => item.scannedAt && item.scannedAt >= recentStart).length;
    const todayBoxes = recentBoxes.filter((item) => {
      return item.scannedAt && item.scannedAt >= todayStart;
    }).length;

    const dailyBoxTrend = recentDays.map((day) => ({
      label: day.label,
      value: recentBoxes.filter((item) => {
        return item.scannedAt?.toISOString().slice(0, 10) === day.key;
      }).length
    }));

    const dailyFlowTrend = recentDays.map((day) => {
      const dailyTransactions = recentTransactions.filter((item) => item.createdAt.toISOString().slice(0, 10) === day.key);
      const positive = dailyTransactions
        .filter((item) => item.type === "RECHARGE" || item.type === "REVERSAL")
        .reduce((sum, item) => sum + Number(item.amount), 0);
      const negative = Math.abs(
        dailyTransactions
          .filter((item) => item.type === "BOX_CHARGE" || item.type === "ITEM_CHARGE")
          .reduce((sum, item) => sum + Number(item.amount), 0)
      );
      return {
        label: day.label,
        positive,
        negative
      };
    });

    const chargeBreakdown = recentTransactions.reduce(
      (accumulator, item) => {
        if (item.type === "BOX_CHARGE") {
          accumulator.box += 1;
        }
        if (item.type === "ITEM_CHARGE") {
          accumulator.item += 1;
        }
        if (item.type === "RECHARGE") {
          accumulator.recharge += 1;
        }
        return accumulator;
      },
      { box: 0, item: 0, recharge: 0 }
    );

    const anomalyBreakdown = recentBoxes.reduce(
      (accumulator, item) => {
        if (item.anomalyType === "SHORTAGE") {
          accumulator.shortage += 1;
        } else if (item.anomalyType === "OVERAGE") {
          accumulator.overage += 1;
        } else if (item.anomalyType === "DUPLICATE") {
          accumulator.duplicate += 1;
        }
        return accumulator;
      },
      { shortage: 0, overage: 0, duplicate: 0 }
    );

    const todayFlow = (dailyFlowTrend.at(-1)?.positive ?? 0) + (dailyFlowTrend.at(-1)?.negative ?? 0);
    const weekFlow = dailyFlowTrend.reduce((sum, item) => sum + item.positive + item.negative, 0);

    return (
      <Shell session={session}>
        <div className="page-stack">
          <HomeHero
            sessionLabel="管理员视角"
            surfaceLabel="管理端工作面"
            featureValue="04"
            featureLabel="今日核心观察项"
            featureNote="客户 · 财务 · 异常 · 对账"
            microStats={[
              { label: "今日入库", value: `${todayBoxes}`, tone: "brand" },
              { label: "待审核充值", value: `${pendingRecharges}`, tone: "accent" },
              { label: "待处理异常", value: `${exceptionBoxes}`, tone: "accent" },
              { label: "余额预警", value: `${totalBalanceAlert}`, tone: "success" }
            ]}
            primaryHref={"/admin" as Route}
            secondaryHref={"/admin/customers" as Route}
            primaryText="进入管理总览"
            secondaryText="查看客户列表"
          />

          <section
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              gap: "1rem"
            }}
          >
            <StatPill label="已开户客户" value={`${totalCustomers}`} />
            <StatPill label="待审核充值" value={`${pendingRecharges}`} />
            <StatPill label="异常箱数量" value={`${exceptionBoxes}`} />
            <StatPill label="余额预警客户" value={`${totalBalanceAlert}`} />
          </section>

          <section className="dashboard-grid">
            <div className="dashboard-span-8" style={{ display: "grid", gap: "1rem" }}>
              <div className="section-head">
                <div>
                  <h3>运营数据</h3>
                  <p className="muted">用图表看今天和近 7 天的操作量、流水节奏与异常结构。</p>
                </div>
              </div>

              <div className="analytics-grid">
                <section className="card soft analytics-card analytics-span-7">
                  <div className="analytics-card-head">
                    <div>
                      <span className="status-chip info">操作趋势</span>
                      <h4>按箱操作趋势</h4>
                    </div>
                    <Boxes size={18} strokeWidth={2} />
                  </div>
                  <div className="analytics-kpis">
                    <div className="mini-surface">
                      <span className="muted">今日操作数</span>
                      <strong>{todayBoxes}</strong>
                    </div>
                    <div className="mini-surface">
                      <span className="muted">近 7 天操作数</span>
                      <strong>{weekBoxes}</strong>
                    </div>
                  </div>
                  <AreaLineChart data={dailyBoxTrend} stroke="#4b82ff" fill="rgba(75,130,255,0.5)" />
                </section>

                <section className="card soft analytics-card analytics-span-5">
                  <div className="analytics-card-head">
                    <div>
                      <span className="status-chip success">流水趋势</span>
                      <h4>日 / 周流水波动</h4>
                    </div>
                    <Wallet size={18} strokeWidth={2} />
                  </div>
                  <div className="analytics-kpis">
                    <div className="mini-surface">
                      <span className="muted">今日流水</span>
                      <strong>{formatMoney(todayFlow.toString(), "USD")}</strong>
                    </div>
                    <div className="mini-surface">
                      <span className="muted">近 7 天流水</span>
                      <strong>{formatMoney(weekFlow.toString(), "USD")}</strong>
                    </div>
                  </div>
                  <CandleFlowChart data={dailyFlowTrend} />
                </section>

                <section className="card soft analytics-card analytics-span-6">
                  <div className="analytics-card-head">
                    <div>
                      <span className="status-chip warning">扣费结构</span>
                      <h4>扣费与入账结构</h4>
                    </div>
                    <ChartColumnBig size={18} strokeWidth={2} />
                  </div>
                  <DonutChart
                    data={[
                      { label: "按箱扣费", value: chargeBreakdown.box, color: "#4b82ff" },
                      { label: "按件扣费", value: chargeBreakdown.item, color: "#ff9a2f" },
                      { label: "充值入账", value: chargeBreakdown.recharge, color: "#23b26d" }
                    ]}
                  />
                </section>

                <section className="card soft analytics-card analytics-span-6">
                  <div className="analytics-card-head">
                    <div>
                      <span className="status-chip warning">异常结构</span>
                      <h4>异常分布</h4>
                    </div>
                    <CircleAlert size={18} strokeWidth={2} />
                  </div>
                  <DonutChart
                    data={[
                      { label: "少件", value: anomalyBreakdown.shortage, color: "#ff8a4c" },
                      { label: "多件", value: anomalyBreakdown.overage, color: "#8b5cf6" },
                      { label: "重复件", value: anomalyBreakdown.duplicate, color: "#f59e0b" }
                    ]}
                  />
                </section>
              </div>
            </div>

            <div className="dashboard-span-4" style={{ display: "grid", gap: "1rem" }}>
              <section className="card soft" style={{ padding: "1.35rem" }}>
                <div className="section-head">
                  <div>
                    <h3>当前重点</h3>
                    <p className="muted">先看最需要处理的事。</p>
                  </div>
                </div>
                <div className="timeline-list">
                  <SignalItem
                    title="充值审核"
                    value={`${pendingRecharges} 条待审`}
                    hint="优先清理入账。"
                    tone="PENDING"
                  />
                  <SignalItem
                    title="异常箱处理"
                    value={`${exceptionBoxes} 个异常`}
                    hint="异常继续在历史页跟进。"
                    tone={exceptionBoxes > 0 ? "EXCEPTION" : "SUCCESS"}
                  />
                  <SignalItem
                    title="余额预警"
                    value={totalBalanceAlert > 0 ? `${totalBalanceAlert} 个客户` : "当前平稳"}
                    hint="建议尽快提醒充值。"
                    tone={totalBalanceAlert > 0 ? "PENDING" : "SUCCESS"}
                  />
                </div>
              </section>
            </div>
          </section>

          <section className="analytics-grid">
            <section className="card soft analytics-card analytics-span-3">
              <div className="analytics-card-head">
                <div>
                  <span className="status-chip info">今日</span>
                  <h4>今日重点</h4>
                </div>
                <BellDot size={18} strokeWidth={2} />
              </div>
              <div className="mini-surface">
                <span className="muted">待审核充值</span>
                <strong>{pendingRecharges}</strong>
              </div>
              <div className="mini-surface">
                <span className="muted">待处理异常箱</span>
                <strong>{exceptionBoxes}</strong>
              </div>
            </section>
            <section className="card soft analytics-card analytics-span-3">
              <div className="analytics-card-head">
                <div>
                  <span className="status-chip success">客户</span>
                  <h4>客户经营</h4>
                </div>
                <Building2 size={18} strokeWidth={2} />
              </div>
              <div className="mini-surface">
                <span className="muted">已开户客户</span>
                <strong>{totalCustomers}</strong>
              </div>
              <div className="mini-surface">
                <span className="muted">余额预警客户</span>
                <strong>{totalBalanceAlert}</strong>
              </div>
            </section>
            <section className="card soft analytics-card analytics-span-3">
              <div className="analytics-card-head">
                <div>
                  <span className="status-chip warning">操作</span>
                  <h4>操作密度</h4>
                </div>
                <ScanLine size={18} strokeWidth={2} />
              </div>
              <div className="mini-surface">
                <span className="muted">近 7 天日均操作</span>
                <strong>{(weekBoxes / 7).toFixed(1)}</strong>
              </div>
              <div className="mini-surface">
                <span className="muted">今日占比</span>
                <strong>{weekBoxes > 0 ? `${Math.round((todayBoxes / weekBoxes) * 100)}%` : "0%"}</strong>
              </div>
            </section>
            <section className="card soft analytics-card analytics-span-3">
              <div className="analytics-card-head">
                <div>
                  <span className="status-chip info">流水</span>
                  <h4>流水效率</h4>
                </div>
                <ReceiptText size={18} strokeWidth={2} />
              </div>
              <div className="mini-surface">
                <span className="muted">充值入账笔数</span>
                <strong>{chargeBreakdown.recharge}</strong>
              </div>
              <div className="mini-surface">
                <span className="muted">扣费笔数</span>
                <strong>{chargeBreakdown.box + chargeBreakdown.item}</strong>
              </div>
            </section>
          </section>
        </div>
      </Shell>
    );
  }

  if (session.role === UserRole.WAREHOUSE_OPERATOR) {
    const [exceptionBoxes, todayScannedBoxes, recentDuplicateCount] = await Promise.all([
      prisma.forecastBox.count({ where: { status: "EXCEPTION" } }),
      prisma.forecastBox.count({ where: { scannedAt: { not: null } } }),
      prisma.trackingScanRecord.count({ where: { isDuplicate: true } })
    ]);

    return (
      <Shell session={session} initialWarehouseLocale={initialWarehouseLocale}>
        <div className="page-stack">
          <section className="card soft" style={{ padding: "1.65rem", display: "grid", gap: "1.5rem", background: "var(--surface-1)" }}>
            <div className="hero-panel-grid">
              <div className="hero-intro-panel">
                <div className="hero-badges">
                  <WarehouseText as="span" className="pill" zh="小包系统" en="Parcel WMS" es="WMS de Paqueteria" />
                  <WarehouseText as="span" className="status-chip info" zh="仓库操作视角" en="Warehouse view" es="Vista de almacen" />
                  <WarehouseText as="span" className="status-chip" zh="统一工作台" en="Unified workspace" es="Espacio unificado" />
                </div>
                <div className="hero-signal-board">
                  <div className="hero-signal-main">
                    <div className="admin-overview-side-label">
                      <WarehouseText as="span" zh="仓库工作台" en="Warehouse desk" es="Mesa de almacen" />
                    </div>
                    <div className="hero-signal-value">LIVE</div>
                    <div className="hero-signal-label">
                      <WarehouseText as="span" zh="扫码主控台" en="Scan desk" es="Mesa de escaneo" />
                    </div>
                    <div className="hero-signal-note">
                      <WarehouseText as="span" zh="连续扫描 · 异常闭环 · 现场节奏" en="Continuous scan · Exception loop · Floor rhythm" es="Escaneo continuo · Excepciones · Ritmo" />
                    </div>
                  </div>
                  <div className="hero-signal-grid">
                    <div className="hero-signal-tile brand">
                      <span><WarehouseText as="span" zh="已扫箱数" en="Boxes scanned" es="Cajas escaneadas" /></span>
                      <strong>{todayScannedBoxes}</strong>
                    </div>
                    <div className="hero-signal-tile accent">
                      <span><WarehouseText as="span" zh="异常" en="Exceptions" es="Excepciones" /></span>
                      <strong>{exceptionBoxes}</strong>
                    </div>
                    <div className="hero-signal-tile accent">
                      <span><WarehouseText as="span" zh="重复件" en="Duplicates" es="Duplicados" /></span>
                      <strong>{recentDuplicateCount}</strong>
                    </div>
                    <div className="hero-signal-tile success">
                      <span><WarehouseText as="span" zh="模式" en="Mode" es="Modo" /></span>
                      <strong><WarehouseText as="span" zh="连续" en="Continuous" es="Continuo" /></strong>
                    </div>
                  </div>
                  <div className="hero-signal-track" aria-hidden="true">
                    <span className="brand" />
                    <span className="accent" />
                    <span className="success" />
                    <span className="brand" />
                    <span className="accent" />
                  </div>
                </div>
                <div className="hero-action-row">
                  <Link href={"/warehouse" as Route} className="button-link">
                    <WarehouseText as="span" zh="进入扫码台" en="Open scan desk" es="Abrir escaneo" />
                    <ArrowUpRight size={16} strokeWidth={2} />
                  </Link>
                  <Link href={"/warehouse/exceptions" as Route} className="button-link secondary">
                    <WarehouseText as="span" zh="查看异常历史" en="View exceptions" es="Ver excepciones" />
                  </Link>
                </div>
              </div>

              <div className="focus-card hero-orbit-card">
                <div className="hero-orbit-header">
                  <div>
                    <div className="admin-overview-side-label">
                      <WarehouseText as="span" zh="三端协同" en="Three-end sync" es="Sincronia de tres extremos" />
                    </div>
                    <strong style={{ fontSize: "1.2rem" }}>
                      <WarehouseText as="span" zh="同一套工作流在三端之间联动" en="One workflow across three work surfaces" es="Un flujo conectado en tres superficies" />
                    </strong>
                  </div>
                  <Layers3 size={22} strokeWidth={2} />
                </div>
                <div className="hero-orbit-stage" aria-hidden="true">
                  <div className="hero-orbit-ring hero-orbit-ring-a" />
                  <div className="hero-orbit-ring hero-orbit-ring-b" />
                  <div className="hero-orbit-core">
                    <span>WMS</span>
                  </div>
                  <div className="hero-orbit-node hero-orbit-node-a">
                    <WarehouseText as="span" zh="客户端" en="Client" es="Cliente" />
                    <WarehouseText as="small" zh="预报 / 箱唛" en="Forecast / Labels" es="Preaviso / Etiquetas" />
                  </div>
                  <div className="hero-orbit-node hero-orbit-node-b">
                    <WarehouseText as="span" zh="仓库端" en="Warehouse" es="Almacen" />
                    <WarehouseText as="small" zh="扫码 / 异常" en="Scan / Exceptions" es="Escaneo / Excepciones" />
                  </div>
                  <div className="hero-orbit-node hero-orbit-node-c">
                    <WarehouseText as="span" zh="管理端" en="Admin" es="Admin" />
                    <WarehouseText as="small" zh="客户 / 财务" en="Clients / Finance" es="Clientes / Finanzas" />
                  </div>
                  <div className="hero-orbit-glow hero-orbit-glow-a" />
                  <div className="hero-orbit-glow hero-orbit-glow-b" />
                </div>
                <div className="hero-orbit-legend">
                  <WarehouseText as="span" className="timeline-chip info" zh="客户端关注余额、预报和导出" en="Client focuses on balance, forecasts and export" es="Cliente: saldo, preavisos y exportacion" />
                  <WarehouseText as="span" className="timeline-chip warning" zh="仓库端关注节奏、状态和异常" en="Warehouse focuses on rhythm, status and exceptions" es="Almacen: ritmo, estado y excepciones" />
                  <WarehouseText as="span" className="timeline-chip success" zh="管理端关注客户、财务和总览" en="Admin focuses on clients, finance and overview" es="Admin: clientes, finanzas y panorama" />
                </div>
              </div>
            </div>
          </section>

          <section
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              gap: "1rem"
            }}
          >
            <div className="card soft" style={{ padding: "1rem 1.1rem", display: "grid", gap: "0.35rem", minHeight: "112px" }}>
              <span className="muted" style={{ fontSize: "0.78rem", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                <WarehouseText as="span" zh="累计已扫箱" en="Total boxes scanned" es="Total cajas escaneadas" />
              </span>
              <strong style={{ fontSize: "1.6rem", lineHeight: 1.02 }}>{todayScannedBoxes}</strong>
            </div>
            <div className="card soft" style={{ padding: "1rem 1.1rem", display: "grid", gap: "0.35rem", minHeight: "112px" }}>
              <span className="muted" style={{ fontSize: "0.78rem", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                <WarehouseText as="span" zh="异常箱数量" en="Exception boxes" es="Cajas con excepcion" />
              </span>
              <strong style={{ fontSize: "1.6rem", lineHeight: 1.02 }}>{exceptionBoxes}</strong>
            </div>
            <div className="card soft" style={{ padding: "1rem 1.1rem", display: "grid", gap: "0.35rem", minHeight: "112px" }}>
              <span className="muted" style={{ fontSize: "0.78rem", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                <WarehouseText as="span" zh="重复件记录" en="Duplicate records" es="Registros duplicados" />
              </span>
              <strong style={{ fontSize: "1.6rem", lineHeight: 1.02 }}>{recentDuplicateCount}</strong>
            </div>
            <div className="card soft" style={{ padding: "1rem 1.1rem", display: "grid", gap: "0.35rem", minHeight: "112px" }}>
              <span className="muted" style={{ fontSize: "0.78rem", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                <WarehouseText as="span" zh="当前模式" en="Current mode" es="Modo actual" />
              </span>
              <strong style={{ fontSize: "1.6rem", lineHeight: 1.02 }}>
                <WarehouseText as="span" zh="连续扫描" en="Continuous scan" es="Escaneo continuo" />
              </strong>
            </div>
          </section>

          <section className="dashboard-grid">
            <div className="dashboard-span-8" style={{ display: "grid", gap: "1rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "1rem" }}>
                <PortalCard
                  title={<WarehouseText as="span" zh="仓库操作端" en="Warehouse desk" es="Mesa de almacen" />}
                  description={<WarehouseText as="span" zh="当前主工作区。支持连续扫描、声音提示、全屏模式、大字模式与异常快捷处理。" en="Primary workspace with continuous scan, sound cues, fullscreen and quick exception handling." es="Espacio principal con escaneo continuo, sonido, pantalla completa y resolucion rapida." />}
                  icon={PackageCheck}
                  href={"/warehouse" as Route}
                  cta={<WarehouseText as="span" zh="进入扫码台" en="Open scan desk" es="Abrir escaneo" />}
                  eyebrow={<WarehouseText as="span" zh="当前" en="Current" es="Actual" />}
                  footerText={<WarehouseText as="span" zh="当前角色可直接进入" en="Available for this role" es="Disponible para este rol" />}
                  active
                  stats={[
                    { label: <WarehouseText as="span" zh="箱状态" en="Box state" es="Estado" />, value: <WarehouseText as="span" zh="实时更新" en="Live update" es="Tiempo real" /> },
                    { label: <WarehouseText as="span" zh="扫码提示" en="Scan cue" es="Aviso" />, value: <WarehouseText as="span" zh="声音反馈" en="Sound feedback" es="Sonido" /> },
                    { label: <WarehouseText as="span" zh="异常" en="Exceptions" es="Excepciones" />, value: `${exceptionBoxes}` },
                    { label: <WarehouseText as="span" zh="重复件" en="Duplicates" es="Duplicados" />, value: `${recentDuplicateCount}` }
                  ]}
                />
                <PortalCard
                  title={<WarehouseText as="span" zh="异常历史" en="Exception history" es="Historial de excepciones" />}
                  description={<WarehouseText as="span" zh="查看自己处理过的异常、附件和责任归属，继续补充闭环信息。" en="Review handled exceptions, attachments and ownership." es="Revisa excepciones resueltas, adjuntos y responsabilidad." />}
                  icon={CircleAlert}
                  href={"/warehouse/exceptions" as Route}
                  cta={<WarehouseText as="span" zh="查看记录" en="View records" es="Ver registros" />}
                  eyebrow={<WarehouseText as="span" zh="历史" en="History" es="Historial" />}
                  footerText={<WarehouseText as="span" zh="沿时间线回看历史处理结果" en="Review handled exceptions in a timeline" es="Revisa las resoluciones en una linea de tiempo" />}
                  stats={[
                    { label: <WarehouseText as="span" zh="处理方式" en="Resolution" es="Resolucion" />, value: <WarehouseText as="span" zh="仓库 / 客户" en="Warehouse / Customer" es="Almacen / Cliente" /> },
                    { label: <WarehouseText as="span" zh="附件" en="Attachments" es="Adjuntos" />, value: <WarehouseText as="span" zh="图片 / PDF" en="Image / PDF" es="Imagen / PDF" /> },
                    { label: <WarehouseText as="span" zh="入口" en="Access" es="Acceso" />, value: <WarehouseText as="span" zh="仓库专用" en="Warehouse only" es="Solo almacen" /> },
                    { label: <WarehouseText as="span" zh="复核" en="Review" es="Revision" />, value: <WarehouseText as="span" zh="可追溯" en="Traceable" es="Trazable" /> }
                  ]}
                />
                <PortalCard
                  title={<WarehouseText as="span" zh="管理协同" en="Cross-team sync" es="Sincronia de equipos" />}
                  description={<WarehouseText as="span" zh="三端共用同一视觉框架。" en="All three ends share the same visual system." es="Los tres extremos comparten el mismo sistema visual." />}
                  icon={Building2}
                  cta={<WarehouseText as="span" zh="统一设计" en="Unified design" es="Diseno unificado" />}
                  eyebrow={<WarehouseText as="span" zh="协同" en="Shared" es="Compartido" />}
                  footerText={<WarehouseText as="span" zh="展示统一工作流入口结构" en="Shows the shared workflow structure" es="Muestra la estructura compartida" />}
                  stats={[
                    { label: <WarehouseText as="span" zh="导航" en="Navigation" es="Navegacion" />, value: <WarehouseText as="span" zh="左侧导航" en="Left nav" es="Nav lateral" /> },
                    { label: <WarehouseText as="span" zh="布局" en="Layout" es="Disposicion" />, value: <WarehouseText as="span" zh="卡片化" en="Card based" es="Tarjetas" /> },
                    { label: <WarehouseText as="span" zh="状态" en="Status" es="Estado" />, value: <WarehouseText as="span" zh="颜色区分" en="Color coded" es="Codificado por color" /> },
                    { label: <WarehouseText as="span" zh="风格" en="Style" es="Estilo" />, value: <WarehouseText as="span" zh="轻玻璃卡片" en="Soft glass" es="Vidrio suave" /> }
                  ]}
                />
              </div>
            </div>

            <div className="dashboard-span-4">
              <section className="card soft" style={{ padding: "1.35rem" }}>
                <div className="section-head">
                  <div>
                    <h3>
                      <WarehouseText as="span" zh="现场提示" en="Floor cues" es="Avisos de piso" />
                    </h3>
                    <p className="muted">
                      <WarehouseText as="span" zh="先看作业结果。" en="Check live outcomes first." es="Primero mira los resultados en vivo." />
                    </p>
                  </div>
                </div>
                <div className="timeline-list">
                  <SignalItem
                    title={<WarehouseText as="span" zh="扫码工作台" en="Scan desk" es="Mesa de escaneo" />}
                    value={<WarehouseText as="span" zh="复核中" en="Verifying" es="Verificando" />}
                    hint={<WarehouseText as="span" zh="扫箱后自动切换流程。" en="Flow switches automatically after box scan." es="El flujo cambia automaticamente despues del escaneo." />}
                    tone="VERIFYING"
                  />
                  <SignalItem
                    title={<WarehouseText as="span" zh="异常箱" en="Exception boxes" es="Cajas con excepcion" />}
                    value={
                      exceptionBoxes > 0 ? (
                        <WarehouseText as="span" zh={`${exceptionBoxes} 个待处理`} en={`${exceptionBoxes} pending`} es={`${exceptionBoxes} pendientes`} />
                      ) : (
                        <WarehouseText as="span" zh="当前平稳" en="Stable now" es="Estado estable" />
                      )
                    }
                    hint={<WarehouseText as="span" zh="异常可直接继续处理。" en="Exceptions can be resolved immediately." es="Las excepciones pueden resolverse de inmediato." />}
                    tone={exceptionBoxes > 0 ? "EXCEPTION" : "SUCCESS"}
                  />
                  <SignalItem
                    title={<WarehouseText as="span" zh="重复件" en="Duplicates" es="Duplicados" />}
                    value={
                      recentDuplicateCount > 0 ? (
                        <WarehouseText as="span" zh={`${recentDuplicateCount} 条记录`} en={`${recentDuplicateCount} records`} es={`${recentDuplicateCount} registros`} />
                      ) : (
                        <WarehouseText as="span" zh="暂无重复" en="No duplicates" es="Sin duplicados" />
                      )
                    }
                    hint={<WarehouseText as="span" zh="重复会记录并单独标记。" en="Duplicates are logged and marked separately." es="Los duplicados se registran y se marcan aparte." />}
                    tone={recentDuplicateCount > 0 ? "PENDING" : "SUCCESS"}
                  />
                </div>
              </section>
            </div>
          </section>

          <section style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "1rem" }}>
            <CapabilityCard
              icon={ScanLine}
              title={<WarehouseText as="span" zh="连续扫描" en="Continuous scan" es="Escaneo continuo" />}
              description={<WarehouseText as="span" zh="自动聚焦、自动清空、自动恢复当前箱。" en="Auto focus, auto clear and auto restore current box." es="Enfoque automatico, limpieza automatica y restauracion de la caja actual." />}
            />
            <CapabilityCard
              icon={BellDot}
              title={<WarehouseText as="span" zh="结果反馈" en="Result feedback" es="Respuesta de resultado" />}
              description={<WarehouseText as="span" zh="成功、重复、异常和账户受限都会即时提示。" en="Success, duplicates, exceptions and account limits are surfaced instantly." es="Exito, duplicados, excepciones y limites de cuenta se muestran al instante." />}
            />
            <CapabilityCard
              icon={FileStack}
              title={<WarehouseText as="span" zh="异常附件" en="Exception attachments" es="Adjuntos de excepcion" />}
              description={<WarehouseText as="span" zh="支持上传图片或 PDF，历史可追溯。" en="Upload image or PDF evidence with full traceability." es="Permite subir imagenes o PDF con trazabilidad completa." />}
            />
            <CapabilityCard
              icon={QrCode}
              title={<WarehouseText as="span" zh="箱唛复打" en="Label reprint" es="Reimpresion de etiqueta" />}
              description={<WarehouseText as="span" zh="支持 A4 和热敏纸复打。" en="Supports both A4 and thermal label reprints." es="Admite reimpresion en A4 y papel termico." />}
            />
          </section>
        </div>
      </Shell>
    );
  }

  const [wallet, forecastCount, pendingRechargeCount, latestForecast] = await Promise.all([
    prisma.wallet.findUnique({ where: { customerId: session.customerId! } }),
    prisma.forecast.count({ where: { customerId: session.customerId! } }),
    prisma.rechargeRequest.count({ where: { customerId: session.customerId!, status: "PENDING" } }),
    prisma.forecast.findFirst({
      where: { customerId: session.customerId! },
      orderBy: { createdAt: "desc" }
    })
  ]);

  const walletBalance = Number(wallet?.balance ?? 0);

  return (
    <Shell session={session}>
      <div className="page-stack">
          <HomeHero
            sessionLabel="客户视角"
            surfaceLabel="客户工作台"
            featureValue={formatMoney(walletBalance, wallet?.currency || "USD")}
            featureLabel="账户主界面"
            featureNote="预报 · 充值 · 对账"
            microStats={[
              { label: "预报数", value: `${forecastCount}`, tone: "brand" },
              { label: "待审核充值", value: `${pendingRechargeCount}`, tone: "accent" },
              { label: "最近预报", value: latestForecast?.forecastNo || "-", tone: "neutral" },
              { label: "账户状态", value: walletBalance > 100 ? "正常" : "建议充值", tone: "success" }
            ]}
            primaryHref={"/customer" as Route}
            secondaryHref={"/customer/statements" as Route}
            primaryText="进入客户工作台"
            secondaryText="查看我的对账单"
          />

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: "1rem"
          }}
        >
          <StatPill label="当前余额" value={formatMoney(walletBalance, wallet?.currency || "USD")} />
          <StatPill label="历史预报数" value={`${forecastCount}`} />
          <StatPill label="待审核充值" value={`${pendingRechargeCount}`} />
          <StatPill label="最近预报号" value={latestForecast?.forecastNo || "-"} />
        </section>

        <section className="dashboard-grid">
          <div className="dashboard-span-8" style={{ display: "grid", gap: "1rem" }}>
            <section
              className="card soft"
              style={{
                padding: "1.6rem",
                display: "grid",
                gap: "1.35rem",
                background: "var(--surface-1)"
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: "1rem",
                  flexWrap: "wrap"
                }}
              >
                <div style={{ display: "grid", gap: "0.45rem", maxWidth: "34rem" }}>
                  <span className="pill">客户工作台</span>
                  <h3 style={{ margin: 0, fontSize: "1.75rem", lineHeight: 1.08 }}>
                    首页只保留你最常用的两件事。
                  </h3>
                  <p className="muted" style={{ margin: 0, lineHeight: 1.7 }}>
                    去填写预报，或者直接查看对账单。箱唛、充值和预报状态都从对应页面进入，不在首页堆太多信息。
                  </p>
                </div>
                <div className="status-chip info">简洁流程</div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "1rem" }}>
                <Link href={"/customer" as Route} style={{ display: "block" }}>
                  <div
                    className="card soft"
                    style={{
                      padding: "1.35rem",
                      display: "grid",
                      gap: "0.9rem",
                      minHeight: "220px",
                      background:
                        "linear-gradient(135deg, color-mix(in srgb, var(--brand) 18%, transparent) 0%, color-mix(in srgb, var(--panel-strong) 96%, transparent) 52%, color-mix(in srgb, var(--accent) 16%, transparent) 100%)",
                      borderColor: "color-mix(in srgb, var(--brand) 22%, transparent)"
                    }}
                  >
                    <div
                      style={{
                        width: "54px",
                        height: "54px",
                        borderRadius: "20px",
                        display: "grid",
                        placeItems: "center",
                        background: "var(--surface-2)",
                        border: "1px solid var(--glass-border)"
                      }}
                    >
                      <Boxes size={22} strokeWidth={2} />
                    </div>
                    <div style={{ display: "grid", gap: "0.45rem" }}>
                      <strong style={{ fontSize: "1.18rem" }}>填写预报</strong>
                      <p className="muted" style={{ margin: 0, lineHeight: 1.65 }}>
                        创建箱子、选择渠道、生成箱唛。这里仍然是客户的主操作入口。
                      </p>
                    </div>
                    <div
                      style={{
                        marginTop: "auto",
                        display: "grid",
                        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                        gap: "0.75rem"
                      }}
                    >
                      <div className="mini-surface">
                        <span className="muted">最近预报</span>
                        <strong>{latestForecast?.forecastNo || "-"}</strong>
                      </div>
                      <div className="mini-surface">
                        <span className="muted">历史预报</span>
                        <strong>{forecastCount}</strong>
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span className="muted">进入后可继续导出箱唛</span>
                      <span className="button-link" style={{ pointerEvents: "none" }}>
                        进入预报
                        <ArrowRight size={16} strokeWidth={2} />
                      </span>
                    </div>
                  </div>
                </Link>

                <Link href={"/customer/statements" as Route} style={{ display: "block" }}>
                  <div
                    className="card soft"
                    style={{
                      padding: "1.35rem",
                      display: "grid",
                      gap: "0.9rem",
                      minHeight: "220px"
                    }}
                  >
                    <div
                      style={{
                        width: "54px",
                        height: "54px",
                        borderRadius: "20px",
                        display: "grid",
                        placeItems: "center",
                        background: "var(--surface-2)",
                        border: "1px solid var(--glass-border)"
                      }}
                    >
                      <ReceiptText size={22} strokeWidth={2} />
                    </div>
                    <div style={{ display: "grid", gap: "0.45rem" }}>
                      <strong style={{ fontSize: "1.18rem" }}>我的对账单</strong>
                      <p className="muted" style={{ margin: 0, lineHeight: 1.65 }}>
                        查看余额变化、充值记录和扣费明细，需要导出时直接从对账单页面完成。
                      </p>
                    </div>
                    <div
                      style={{
                        marginTop: "auto",
                        display: "grid",
                        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                        gap: "0.75rem"
                      }}
                    >
                      <div className="mini-surface">
                        <span className="muted">当前余额</span>
                        <strong>{formatMoney(walletBalance, wallet?.currency || "USD")}</strong>
                      </div>
                      <div className="mini-surface">
                        <span className="muted">导出能力</span>
                        <strong>CSV / PDF</strong>
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span className="muted">所有金额均来自钱包流水</span>
                      <span className="button-link secondary" style={{ pointerEvents: "none" }}>
                        查看账单
                        <ArrowRight size={16} strokeWidth={2} />
                      </span>
                    </div>
                  </div>
                </Link>
              </div>
            </section>
          </div>

          <div className="dashboard-span-4" style={{ display: "grid", gap: "1rem" }}>
            <section className="card soft" style={{ padding: "1.35rem" }}>
              <div className="section-head">
                <div>
                  <h3>账户状态</h3>
                  <p className="muted">重要状态集中在这里。</p>
                </div>
              </div>
              <div className="timeline-list">
                <SignalItem
                  title="钱包余额"
                  value={walletBalance > 100 ? "余额充足" : "建议充值"}
                  hint={formatMoney(walletBalance, wallet?.currency || "USD")}
                  tone={walletBalance > 100 ? "SUCCESS" : "PENDING"}
                />
                <SignalItem
                  title="充值审核"
                  value={pendingRechargeCount > 0 ? `${pendingRechargeCount} 条待审` : "无待审"}
                  hint={pendingRechargeCount > 0 ? "审核通过后自动入账。" : "当前没有待处理充值申请。"}
                  tone={pendingRechargeCount > 0 ? "PENDING" : "SUCCESS"}
                />
                <SignalItem
                  title="最近预报"
                  value={latestForecast?.forecastNo || "暂无预报"}
                  hint={latestForecast ? "可前往预报列表继续导出箱唛或查看状态。" : "先创建第一条预报。"}
                  tone={latestForecast ? "VERIFYING" : "SUCCESS"}
                />
              </div>
            </section>

            <section
              className="card soft"
              style={{
                padding: "1.35rem",
                display: "grid",
                gap: "0.85rem"
              }}
            >
              <div>
                <h3 style={{ margin: 0 }}>快捷入口</h3>
                <p className="muted" style={{ margin: "0.35rem 0 0", lineHeight: 1.65 }}>
                  客户端只保留 4 个页面，减少来回切换。
                </p>
              </div>
              <div style={{ display: "grid", gap: "0.7rem" }}>
                <Link href={"/customer/forecasts" as Route} className="button-link secondary" style={{ justifyContent: "space-between" }}>
                  预报列表
                  <ArrowRight size={16} strokeWidth={2} />
                </Link>
                <Link href={"/customer/recharge" as Route} className="button-link secondary" style={{ justifyContent: "space-between" }}>
                  提交充值
                  <ArrowRight size={16} strokeWidth={2} />
                </Link>
              </div>
            </section>
          </div>
        </section>
      </div>
    </Shell>
  );
}
