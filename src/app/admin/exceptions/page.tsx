import { BoxExceptionResolution, ScanAnomalyType, UserRole } from "@prisma/client";
import { ArrowUpRight, CircleAlert, FileText, ShieldAlert } from "lucide-react";
import { Shell } from "@/components/layout";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate, formatStatusLabel, getStatusTone } from "@/lib/utils";

export default async function AdminExceptionsPage({
  searchParams
}: {
  searchParams: Promise<{
    customerId?: string;
    anomalyType?: string;
    resolution?: string;
    dateFrom?: string;
    dateTo?: string;
  }>;
}) {
  const session = await requireRole([UserRole.ADMIN]);
  const params = await searchParams;

  const [customers, records] = await Promise.all([
    prisma.customer.findMany({ orderBy: { companyName: "asc" } }),
    prisma.boxExceptionHandlingRecord.findMany({
      where: {
        resolution: (params.resolution as BoxExceptionResolution | undefined) || undefined,
        handledAt:
          params.dateFrom || params.dateTo
            ? {
                gte: params.dateFrom ? new Date(`${params.dateFrom}T00:00:00`) : undefined,
                lte: params.dateTo ? new Date(`${params.dateTo}T23:59:59`) : undefined
              }
            : undefined,
        forecastBox: {
          forecast: {
            customerId: params.customerId || undefined
          },
          anomalyType: (params.anomalyType as ScanAnomalyType | undefined) || undefined
        }
      },
      include: {
        handledByUser: true,
        forecastBox: {
          include: {
            forecast: {
              include: { customer: true }
            }
          }
        },
        attachments: {
          include: { fileAsset: true }
        }
      },
      orderBy: { handledAt: "desc" }
    })
  ]);

  const confirmedCount = records.filter((record) => record.resolution === BoxExceptionResolution.CONFIRMED_NORMAL).length;
  const customerResponsibleCount = records.filter(
    (record) => record.resolution === BoxExceptionResolution.CUSTOMER_RESPONSIBLE
  ).length;
  const warehouseResponsibleCount = records.filter(
    (record) => record.resolution === BoxExceptionResolution.WAREHOUSE_RESPONSIBLE
  ).length;

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
              <span className="pill">异常历史</span>
              <h2>异常历史</h2>
              <p className="muted">后台统一查看全部异常处理记录、附件与责任归属，视觉上和财务页、客户页完全对齐。</p>
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
              <div className="admin-overview-side-label">当前结果</div>
              <strong>{records.length} 条异常记录</strong>
              <span className="muted">{params.dateFrom || params.dateTo ? "已带日期筛选" : "未限制处理日期"}</span>
            </div>
          </div>
        </section>

        <div className="card soft filter-card" style={sectionStyle}>
          <div className="section-head">
            <div>
              <h3>筛选条件</h3>
              <p className="muted">支持按客户、异常类型、处理结论和处理日期范围查询。</p>
            </div>
          </div>
          <form className="stacked" method="GET">
            <div className="grid three">
              <select name="customerId" defaultValue={params.customerId || ""}>
                <option value="">全部客户</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>{customer.companyName}</option>
                ))}
              </select>
              <select name="anomalyType" defaultValue={params.anomalyType || ""}>
                <option value="">全部异常类型</option>
                <option value="SHORTAGE">少件</option>
                <option value="OVERAGE">多件</option>
                <option value="DUPLICATE">重复件</option>
                <option value="INSUFFICIENT_BALANCE">余额不足</option>
              </select>
              <select name="resolution" defaultValue={params.resolution || ""}>
                <option value="">全部处理结论</option>
                <option value="PENDING">待处理</option>
                <option value="CONFIRMED_NORMAL">已确认正常</option>
                <option value="CUSTOMER_RESPONSIBLE">客户责任</option>
                <option value="WAREHOUSE_RESPONSIBLE">仓库责任</option>
              </select>
              <input name="dateFrom" type="date" defaultValue={params.dateFrom || ""} />
              <input name="dateTo" type="date" defaultValue={params.dateTo || ""} />
              <div className="toolbar">
                <button type="submit">筛选记录</button>
              </div>
            </div>
          </form>
        </div>

        <div className="summary-grid">
          <div className="summary-box" style={summaryStyle}>异常记录<strong>{records.length}</strong></div>
          <div className="summary-box" style={summaryStyle}>已确认正常<strong>{confirmedCount}</strong></div>
          <div className="summary-box" style={summaryStyle}>客户责任<strong>{customerResponsibleCount}</strong></div>
          <div className="summary-box" style={summaryStyle}>仓库责任<strong>{warehouseResponsibleCount}</strong></div>
        </div>

        <div className="card soft" style={sectionStyle}>
          <div className="section-head">
            <div>
              <h3>处理明细</h3>
              <p className="muted">改成异常时间线，附件和责任结论都直接挂在事件节点上。</p>
            </div>
          </div>
          <div className="timeline-list">
            {records.length > 0 ? (
              records.map((record) => (
                <div key={record.id} className="timeline-item">
                  <div className="timeline-title-row">
                    <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                      <div className="sidebar-profile-avatar">
                        <CircleAlert size={18} strokeWidth={2} />
                      </div>
                      <div>
                        <strong>{record.forecastBox.forecast.customer.companyName}</strong>
                        <div className="muted">
                          {record.forecastBox.forecast.forecastNo} / {record.forecastBox.boxNo}
                        </div>
                      </div>
                    </div>
                    <span className={`pill ${getStatusTone(record.resolution)}`}>{formatStatusLabel(record.resolution)}</span>
                  </div>

                  <div className="timeline-cluster">
                    <span className="timeline-chip">
                      <ShieldAlert size={14} strokeWidth={2} />
                      {formatStatusLabel(record.forecastBox.anomalyType)}
                    </span>
                    <span className="timeline-chip">{record.handledByUser?.name || "-"}</span>
                    <span className="timeline-chip">{formatDate(record.handledAt)}</span>
                  </div>

                  <div className="timeline-note">
                    {record.forecastBox.anomalyNote || "无异常备注"} / {record.note || "无处理备注"}
                  </div>

                  {record.attachments.length > 0 ? (
                    <div className="timeline-cluster">
                      {record.attachments.map((attachment) => (
                        <div key={attachment.id} className="attachment-item">
                          <a href={`/api/files/${attachment.fileAsset.id}`} target="_blank" className="button-link secondary">
                            <FileText size={14} strokeWidth={2} />
                            {attachment.fileAsset.originalFilename}
                            <ArrowUpRight size={12} strokeWidth={2} />
                          </a>
                          {attachment.fileAsset.mimeType.startsWith("image/") ? (
                            <img
                              className="attachment-thumb"
                              src={`/api/files/${attachment.fileAsset.id}`}
                              alt={attachment.fileAsset.originalFilename}
                            />
                          ) : (
                            <span className="muted">PDF 附件</span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="muted">无附件</div>
                  )}
                </div>
              ))
            ) : (
              <div className="muted">当前筛选条件下暂无异常处理记录。</div>
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}
