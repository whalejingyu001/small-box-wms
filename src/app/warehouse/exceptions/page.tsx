import { cookies } from "next/headers";
import { BoxExceptionResolution, ScanAnomalyType, UserRole } from "@prisma/client";
import { ArrowUpRight, CircleAlert, FileText, ShieldAlert, UserRound } from "lucide-react";
import Link from "next/link";
import { Shell } from "@/components/layout";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStatusTone } from "@/lib/utils";
import {
  WAREHOUSE_LOCALE_COOKIE,
  WarehouseDateText,
  WarehouseMessageText,
  WarehouseText,
  type WarehouseLocale
} from "@/components/warehouse-locale";

function WarehouseStatusText({ code }: { code: string | null | undefined }) {
  switch (code) {
    case "CONFIRMED_NORMAL":
      return <WarehouseText as="span" zh="已确认正常" en="Confirmed normal" es="Confirmado normal" />;
    case "CUSTOMER_RESPONSIBLE":
      return <WarehouseText as="span" zh="客户责任" en="Customer responsibility" es="Responsabilidad del cliente" />;
    case "WAREHOUSE_RESPONSIBLE":
      return <WarehouseText as="span" zh="仓库责任" en="Warehouse responsibility" es="Responsabilidad del almacen" />;
    case "SHORTAGE":
      return <WarehouseText as="span" zh="少件" en="Shortage" es="Faltante" />;
    case "OVERAGE":
      return <WarehouseText as="span" zh="多件" en="Overage" es="Exceso" />;
    case "DUPLICATE":
      return <WarehouseText as="span" zh="重复件" en="Duplicate" es="Duplicado" />;
    default:
      return <span>{code || "-"}</span>;
  }
}

export default async function WarehouseExceptionsPage({
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
  const session = await requireRole([UserRole.WAREHOUSE_OPERATOR, UserRole.ADMIN]);
  const cookieStore = await cookies();
  const warehouseLocaleCookie = cookieStore.get(WAREHOUSE_LOCALE_COOKIE)?.value;
  const initialWarehouseLocale: WarehouseLocale =
    warehouseLocaleCookie === "en" || warehouseLocaleCookie === "es" || warehouseLocaleCookie === "zh"
      ? warehouseLocaleCookie
      : "zh";
  const params = await searchParams;

  const [customers, records] = await Promise.all([
    prisma.customer.findMany({ orderBy: { companyName: "asc" } }),
    prisma.boxExceptionHandlingRecord.findMany({
      where: {
        handledByUserId: session.role === UserRole.WAREHOUSE_OPERATOR ? session.userId : undefined,
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
  const activeFilterCount = [
    params.customerId,
    params.anomalyType,
    params.resolution,
    params.dateFrom,
    params.dateTo
  ].filter(Boolean).length;

  return (
    <Shell session={session} initialWarehouseLocale={initialWarehouseLocale}>
      <div className="page-stack">
        <section className="card soft admin-overview-hero">
          <div className="section-head">
            <div>
              <WarehouseText as="span" className="pill" zh="异常历史" en="Exception History" es="Historial de excepciones" />
              <WarehouseText as="h2" zh="异常历史与处理结果" en="Exception History and Results" es="Historial y resultados" />
              <WarehouseText
                as="p"
                className="muted"
                zh="保留现有筛选和附件查看能力，但把结果区整理成更适合现场回看的时间线卡片。"
                en="Keep filters and attachments, but present results as a timeline."
                es="Mantiene filtros y adjuntos, con resultados en linea de tiempo."
              />
            </div>
            <div className="admin-overview-side">
              <WarehouseText as="div" className="admin-overview-side-label" zh="当前结果集" en="Current result set" es="Resultado actual" />
              <strong>
                {records.length} <WarehouseText as="span" zh="条异常记录" en="exception records" es="registros de excepcion" />
              </strong>
              {activeFilterCount > 0 ? (
                <span className="muted">
                  <WarehouseText as="span" zh="已启用" en="Active filters" es="Filtros activos" /> {activeFilterCount}
                </span>
              ) : (
                <WarehouseText as="span" className="muted" zh="当前未启用筛选条件" en="No filters enabled" es="Sin filtros activos" />
              )}
            </div>
          </div>
        </section>

        <div className="summary-grid">
          <div className="summary-box">
            <WarehouseText as="span" zh="异常记录" en="Exception records" es="Registros" /><strong>{records.length}</strong>
          </div>
          <div className="summary-box">
            <WarehouseText as="span" zh="已确认正常" en="Confirmed normal" es="Confirmado normal" /><strong>{confirmedCount}</strong>
          </div>
          <div className="summary-box">
            <WarehouseText as="span" zh="客户责任" en="Customer responsibility" es="Responsabilidad del cliente" /><strong>{customerResponsibleCount}</strong>
          </div>
          <div className="summary-box">
            <WarehouseText as="span" zh="仓库责任" en="Warehouse responsibility" es="Responsabilidad del almacen" /><strong>{warehouseResponsibleCount}</strong>
          </div>
        </div>

        <section className="card soft filter-card">
          <div className="section-head">
            <div>
              <WarehouseText as="h3" zh="筛选条件" en="Filters" es="Filtros" />
              <WarehouseText as="p" className="muted" zh="按客户、异常类型、处理结论和日期范围快速定位异常闭环记录。" en="Filter by client, type, resolution and date." es="Filtra por cliente, tipo, resolucion y fecha." />
            </div>
            <WarehouseText as="span" className="pill" zh="筛选" en="Filter" es="Filtro" />
          </div>
          <form className="stacked" method="GET">
            <div className="grid three">
              <select name="customerId" defaultValue={params.customerId || ""}>
                <WarehouseText as="option" value="" zh="全部客户" en="All clients" es="Todos los clientes" />
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.companyName}
                  </option>
                ))}
              </select>
              <select name="anomalyType" defaultValue={params.anomalyType || ""}>
                <WarehouseText as="option" value="" zh="全部异常类型" en="All anomaly types" es="Todos los tipos" />
                <WarehouseText as="option" value="SHORTAGE" zh="少件" en="Shortage" es="Faltante" />
                <WarehouseText as="option" value="OVERAGE" zh="多件" en="Overage" es="Exceso" />
                <WarehouseText as="option" value="DUPLICATE" zh="重复件" en="Duplicate" es="Duplicado" />
              </select>
              <select name="resolution" defaultValue={params.resolution || ""}>
                <WarehouseText as="option" value="" zh="全部处理结论" en="All resolutions" es="Todas las resoluciones" />
                <WarehouseText as="option" value="CONFIRMED_NORMAL" zh="已确认正常" en="Confirmed normal" es="Confirmado normal" />
                <WarehouseText as="option" value="CUSTOMER_RESPONSIBLE" zh="客户责任" en="Customer responsibility" es="Responsabilidad del cliente" />
                <WarehouseText as="option" value="WAREHOUSE_RESPONSIBLE" zh="仓库责任" en="Warehouse responsibility" es="Responsabilidad del almacen" />
              </select>
              <input name="dateFrom" type="date" defaultValue={params.dateFrom || ""} />
              <input name="dateTo" type="date" defaultValue={params.dateTo || ""} />
              <div className="toolbar">
                <button type="submit"><WarehouseText as="span" zh="筛选记录" en="Apply filters" es="Aplicar filtros" /></button>
                <Link href="/warehouse"><WarehouseText as="span" zh="返回扫码台" en="Back to scan desk" es="Volver al escaneo" /></Link>
              </div>
            </div>
          </form>
        </section>

        <section className="card soft">
          <div className="section-head">
            <div>
              <WarehouseText as="h3" zh="处理时间线" en="Resolution timeline" es="Linea de tiempo" />
              <WarehouseText as="p" className="muted" zh="每条记录直接展示客户、箱号、责任归属、附件与处理人，方便仓库端顺着事件回看。" en="Each record shows client, box, ownership, attachments and handler." es="Cada registro muestra cliente, caja, responsabilidad, adjuntos y responsable." />
            </div>
            <span className="muted"><WarehouseText as="span" zh="共" en="Total" es="Total" /> {records.length}</span>
          </div>

          <div className="timeline-list">
            {records.length > 0 ? (
              records.map((record) => (
                <article key={record.id} className="timeline-item">
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
                    <span className={`pill ${getStatusTone(record.resolution)}`}><WarehouseStatusText code={record.resolution} /></span>
                  </div>

                  <div className="timeline-cluster">
                    <span className="timeline-chip">
                      <ShieldAlert size={14} strokeWidth={2} />
                      <WarehouseStatusText code={record.forecastBox.anomalyType} />
                    </span>
                    <span className="timeline-chip">
                      <UserRound size={14} strokeWidth={2} />
                      <WarehouseText as="span" zh="仓库操作员" en="Warehouse operator" es="Operador de almacen" />
                    </span>
                    <span className="timeline-chip"><WarehouseDateText value={record.handledAt} /></span>
                  </div>

                  <div className="timeline-note">
                    <div className="detail-row">
                      <strong><WarehouseText as="span" zh="异常备注" en="Exception note" es="Nota de excepcion" /></strong>
                      {record.forecastBox.anomalyNote ? <WarehouseMessageText value={record.forecastBox.anomalyNote} /> : <span>—</span>}
                    </div>
                    <div className="detail-row">
                      <strong><WarehouseText as="span" zh="处理备注" en="Resolution note" es="Nota de resolucion" /></strong>
                      <span>{record.note || "—"}</span>
                    </div>
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
                            <WarehouseText as="span" className="muted" zh="PDF 附件" en="PDF attachment" es="Adjunto PDF" />
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <WarehouseText as="div" className="muted" zh="无附件" en="No attachments" es="Sin adjuntos" />
                  )}
                </article>
              ))
            ) : (
              <WarehouseText as="div" className="muted" zh="当前筛选条件下暂无异常处理记录。" en="No records under current filters." es="No hay registros con los filtros actuales." />
            )}
          </div>
        </section>
      </div>
    </Shell>
  );
}
