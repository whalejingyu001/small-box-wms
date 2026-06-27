import { FinanceArchiveType, UserRole } from "@prisma/client";
import { Archive, ArrowUpRight, CalendarRange, FileText, FolderOutput } from "lucide-react";
import { Shell } from "@/components/layout";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { createFinanceArchiveAction } from "@/server/actions";
import { listFinanceArchives } from "@/services/finance-archive-service";

export default async function AdminArchivesPage() {
  const session = await requireRole([UserRole.ADMIN]);
  const [customers, archives] = await Promise.all([
    prisma.customer.findMany({ orderBy: { companyName: "asc" } }),
    listFinanceArchives()
  ]);

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
              <span className="pill">归档中心</span>
              <h2>财务归档中心</h2>
              <p className="muted">把生成动作和历史记录包进同一层白色大圆角面板里，方便归档时先创建，再直接复查下载。</p>
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
              <div className="admin-overview-side-label">归档状态</div>
              <strong>{archives.length} 份历史归档</strong>
              <span className="muted">当前可选 {customers.length} 个客户</span>
            </div>
          </div>
        </section>

        <div className="grid two" style={{ gridTemplateColumns: "minmax(0, 1.15fr) minmax(280px, 0.85fr)" }}>
          <div className="card soft filter-card" style={sectionStyle}>
            <div className="section-head">
              <div>
                <h3>生成归档</h3>
                <p className="muted">同一客户同一日期范围可以重复生成，系统会给不同归档编号。</p>
              </div>
            </div>
            <form action={createFinanceArchiveAction} className="stacked">
              <select name="type" defaultValue={FinanceArchiveType.CUSTOMER_STATEMENT_PDF}>
                <option value={FinanceArchiveType.CUSTOMER_STATEMENT_PDF}>客户对账单 PDF</option>
                <option value={FinanceArchiveType.CUSTOMER_STATEMENT_CSV}>客户对账单 CSV</option>
                <option value={FinanceArchiveType.FINANCE_REPORT_CSV}>财务报表 CSV</option>
              </select>
              <select name="customerId" defaultValue="">
                <option value="">全部客户 / 非客户归档</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.companyName}
                  </option>
                ))}
              </select>
              <div className="grid three">
                <input name="dateFrom" type="date" required />
                <input name="dateTo" type="date" required />
                <select name="groupBy" defaultValue="day">
                  <option value="day">财务报表按日</option>
                  <option value="month">财务报表按月</option>
                </select>
              </div>
              <textarea name="remarks" placeholder="备注，可填写归档用途或补充说明" />
              <button type="submit">生成归档</button>
              <div className="muted">客户对账单归档必须选择客户；财务报表 CSV 可按全部客户或单客户生成归档记录。</div>
            </form>
          </div>

          <div className="card soft stacked" style={sectionStyle}>
            <div className="section-head">
              <div>
                <h3>归档提示</h3>
                <p className="muted">这一侧只做说明，避免把表单堆得过满。</p>
              </div>
            </div>
            <div className="compact-list">
              <div className="compact-item" style={summaryStyle}>
                <strong>客户对账单</strong>
                <span className="muted">生成 PDF 或 CSV 时必须带客户维度，便于回查到单一客户。</span>
              </div>
              <div className="compact-item" style={summaryStyle}>
                <strong>财务报表</strong>
                <span className="muted">支持全部客户或单客户视角，按日或按月归档。</span>
              </div>
              <div className="compact-item" style={summaryStyle}>
                <strong>下载留痕</strong>
                <span className="muted">历史记录的下载链接和存储路径保留原样，没有改动归档链路。</span>
              </div>
            </div>
          </div>
        </div>

        <div className="card soft" style={sectionStyle}>
          <div className="section-head">
            <div>
              <h3>归档记录</h3>
              <p className="muted">归档历史改成时间线，生成信息、日期范围和下载入口直接在节点里查看。</p>
            </div>
          </div>
          <div className="timeline-list">
            {archives.map((archive) => (
              <div key={archive.id} className="timeline-item">
                <div className="timeline-title-row">
                  <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                    <div className="sidebar-profile-avatar">
                      <Archive size={18} strokeWidth={2} />
                    </div>
                    <div>
                      <strong>{archive.archiveNo}</strong>
                      <div className="muted">{archive.type}</div>
                    </div>
                  </div>
                  <span className="timeline-chip">{archive.customer?.companyName || "全部客户"}</span>
                </div>
                <div className="timeline-cluster">
                  <span className="timeline-chip">
                    <CalendarRange size={14} strokeWidth={2} />
                    {archive.dateFrom.toISOString().slice(0, 10)} 至 {archive.dateTo.toISOString().slice(0, 10)}
                  </span>
                  <span className="timeline-chip">{archive.generatedByUser?.name || "-"}</span>
                  <span className="timeline-chip">{formatDate(archive.createdAt)}</span>
                </div>
                <div className="timeline-note">{archive.remarks || "无备注"}</div>
                <div className="timeline-actions">
                  <a href={archive.downloadPath} target="_blank" className="button-link">
                    <FolderOutput size={14} strokeWidth={2} />
                    下载归档
                    <ArrowUpRight size={12} strokeWidth={2} />
                  </a>
                  <span className="timeline-chip">
                    <FileText size={14} strokeWidth={2} />
                    {archive.storagePath}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Shell>
  );
}
