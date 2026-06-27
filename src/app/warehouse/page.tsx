import { cookies } from "next/headers";
import { UserRole } from "@prisma/client";
import Link from "next/link";
import { AlertTriangle, ArrowUpRight, Boxes, CircleAlert, QrCode, ScanLine } from "lucide-react";
import { Shell } from "@/components/layout";
import {
  WAREHOUSE_LOCALE_COOKIE,
  WarehouseDateText,
  WarehouseMessageText,
  WarehouseText,
  type WarehouseLocale
} from "@/components/warehouse-locale";
import { WarehouseScanStation } from "@/components/warehouse-scan-station";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStatusTone } from "@/lib/utils";
import { resolveBoxExceptionAction } from "@/server/actions";

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
    case "EXCEPTION":
      return <WarehouseText as="span" zh="异常" en="Exception" es="Excepcion" />;
    case "VERIFIED":
      return <WarehouseText as="span" zh="已复核" en="Verified" es="Verificado" />;
    case "LABEL_SCANNED":
      return <WarehouseText as="span" zh="已扫箱唛" en="Label scanned" es="Etiqueta escaneada" />;
    default:
      return <span>{code || "-"}</span>;
  }
}

export default async function WarehousePage() {
  const session = await requireRole([UserRole.WAREHOUSE_OPERATOR, UserRole.ADMIN]);
  const cookieStore = await cookies();
  const warehouseLocaleCookie = cookieStore.get(WAREHOUSE_LOCALE_COOKIE)?.value;
  const initialWarehouseLocale: WarehouseLocale =
    warehouseLocaleCookie === "en" || warehouseLocaleCookie === "es" || warehouseLocaleCookie === "zh"
      ? warehouseLocaleCookie
      : "zh";
  const [recentBoxes, recentTracking, exceptionBoxes] = await Promise.all([
    prisma.forecastBox.findMany({
      include: { forecast: { include: { customer: true } }, trackingScans: true },
      orderBy: { scannedAt: "desc" },
      take: 20
    }),
    prisma.trackingScanRecord.findMany({
      include: { forecastBox: { include: { forecast: { include: { customer: true } } } } },
      orderBy: { scannedAt: "desc" },
      take: 20
    }),
    prisma.forecastBox.findMany({
      where: { status: "EXCEPTION" },
      include: {
        forecast: { include: { customer: true } },
        trackingScans: true,
        exceptionRecords: {
          include: {
            attachments: {
              include: {
                fileAsset: true
              }
            }
          },
          orderBy: { handledAt: "desc" }
        }
      },
      orderBy: { scannedAt: "desc" },
      take: 20
    })
  ]);

  const verifiedBoxes = recentBoxes.filter((box) => box.status === "VERIFIED" || box.status === "LABEL_SCANNED").length;
  const boxesWithTracking = recentBoxes.filter((box) => box.trackingScans.length > 0).length;
  const validTrackingCount = recentTracking.filter((item) => !item.isDuplicate).length;
  const duplicateTrackingCount = recentTracking.filter((item) => item.isDuplicate).length;
  const unresolvedExceptionCount = exceptionBoxes.filter((box) => box.exceptionResolution === "PENDING").length;
  const stationCards = [
    {
      title: { zh: "先扫箱", en: "Scan box first", es: "Primero la caja" },
      description: {
        zh: "当前未选箱时，只扫箱唛。",
        en: "When no box is active, scan only the label.",
        es: "Cuando no hay caja activa, escanea solo la etiqueta."
      },
      emphasis: { zh: "进入当前箱上下文", en: "Enter active box context", es: "Entrar al contexto activo" }
    },
    {
      title: { zh: "再扫件", en: "Then scan items", es: "Luego las piezas" },
      description: {
        zh: "按件客户进入连续扫件，按箱客户可直接结束。",
        en: "Per-item billing continues with tracking scans; per-box can finish directly.",
        es: "Por pieza sigue con guias; por caja puede terminar directo."
      },
      emphasis: { zh: "减少判断切换", en: "Less switching", es: "Menos cambio" }
    },
    {
      title: { zh: "异常再处理", en: "Handle exceptions last", es: "Excepciones al final" },
      description: {
        zh: "异常才打开侧栏，其余时间不打扰扫描。",
        en: "The side panel opens only when an issue appears.",
        es: "El panel lateral solo aparece cuando hay incidencia."
      },
      emphasis: {
        zh: `${unresolvedExceptionCount} 个待处理异常`,
        en: `${unresolvedExceptionCount} pending exceptions`,
        es: `${unresolvedExceptionCount} excepciones pendientes`
      }
    }
  ];

  return (
    <Shell session={session} initialWarehouseLocale={initialWarehouseLocale}>
      <div className="page-stack">
        <section className="card soft admin-overview-hero">
          <div className="section-head">
            <div>
              <WarehouseText as="span" className="pill" zh="仓库工作台" en="Warehouse Station" es="Estacion de almacen" />
              <WarehouseText as="h2" zh="仓库扫码工作台" en="Warehouse Scan Desk" es="Mesa de escaneo" />
              <WarehouseText as="p" className="muted" zh="把第一屏收成只服务扫码动作，历史和异常回看下沉到后面。" en="The first screen focuses only on scanning." es="La primera pantalla solo se enfoca en escaneo." />
            </div>
            <div className="admin-overview-side">
              <WarehouseText as="div" className="admin-overview-side-label" zh="当前重点" en="Current focus" es="Foco actual" />
              <strong>
                {recentBoxes.length} <WarehouseText as="span" zh="条最近箱唛" en="recent labels" es="labels recientes" /> /{" "}
                {unresolvedExceptionCount} <WarehouseText as="span" zh="个待处理异常" en="pending exceptions" es="excepciones pendientes" />
              </strong>
              <WarehouseText as="span" className="muted" zh="先扫，再判，再回看" en="Scan, confirm, then review" es="Escanear, confirmar y revisar" />
            </div>
          </div>
        </section>

        <section className="summary-grid">
          <div className="summary-box">
            <WarehouseText as="span" zh="最近箱唛" en="Recent labels" es="Labels recientes" />
            <strong>{recentBoxes.length}</strong>
          </div>
          <div className="summary-box">
            <WarehouseText as="span" zh="已完成箱数" en="Completed boxes" es="Cajas completadas" />
            <strong>{verifiedBoxes}</strong>
          </div>
          <div className="summary-box">
            <WarehouseText as="span" zh="有扫件记录箱数" en="Boxes with item scans" es="Cajas con escaneo" />
            <strong>{boxesWithTracking}</strong>
          </div>
          <div className="summary-box">
            <WarehouseText as="span" zh="有效追踪号" en="Valid tracking" es="Guias validas" />
            <strong>{validTrackingCount}</strong>
          </div>
          <div className="summary-box">
            <WarehouseText as="span" zh="重复件" en="Duplicates" es="Duplicados" />
            <strong>{duplicateTrackingCount}</strong>
          </div>
          <div className="summary-box">
            <WarehouseText as="span" zh="待处理异常" en="Pending exceptions" es="Excepciones pendientes" />
            <strong>{unresolvedExceptionCount}</strong>
          </div>
        </section>

        <div className="split-grid">
          <section className="card soft stacked">
            <div className="section-head">
              <div>
                <WarehouseText as="h3" zh="扫码工作区" en="Scan area" es="Area de escaneo" />
                <WarehouseText as="p" className="muted" zh="第一屏只保留固定结果、扫码输入和异常处理。" en="Only keep result bar, input and exception handling." es="Solo deja resultado, entrada y excepciones." />
              </div>
              <WarehouseText as="span" className="pill" zh="实时作业" en="Live" es="En vivo" />
            </div>
            <WarehouseScanStation />
          </section>

          <section className="card soft stacked">
            <div className="section-head">
              <div>
                <WarehouseText as="h3" zh="工作台说明" en="Station guide" es="Guia de estacion" />
                <WarehouseText as="p" className="muted" zh="把现场顺序压缩成最短操作提醒。" en="Compress the floor order into short reminders." es="Resume el flujo en recordatorios cortos." />
              </div>
            </div>
            <div className="compact-list">
              {stationCards.map((card) => (
                <div key={card.title.zh} className="compact-item">
                  <strong><WarehouseText as="span" {...card.title} /></strong>
                  <span className="muted"><WarehouseText as="span" {...card.description} /></span>
                  <span><WarehouseText as="span" {...card.emphasis} /></span>
                </div>
              ))}
            </div>
            <div className="link-list">
              <Link href="/warehouse/exceptions"><WarehouseText as="span" zh="查看异常历史" en="Open exception history" es="Abrir historial" /></Link>
            </div>
          </section>
        </div>

        <section className="card soft">
          <div className="section-head">
            <div>
              <WarehouseText as="h3" zh="最近异常箱处理" en="Recent exception handling" es="Resoluciones recientes" />
              <WarehouseText as="p" className="muted" zh="这里统一回看异常结论、备注和附件，不放进第一屏主操作区。" en="Review resolutions, notes and attachments here instead of the first screen." es="Aqui revisas resoluciones, notas y adjuntos fuera de la primera pantalla." />
            </div>
            <div className="muted">
              <WarehouseText as="span" zh="最近" en="Recent" es="Recientes" /> {exceptionBoxes.length} <WarehouseText as="span" zh="条" en="records" es="registros" />
            </div>
          </div>
          <div className="timeline-list">
            {exceptionBoxes.length > 0 ? (
              exceptionBoxes.map((box) => (
                <article key={box.id} className="timeline-item">
                  <div className="timeline-title-row">
                    <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                      <div className="sidebar-profile-avatar">
                        <AlertTriangle size={18} strokeWidth={2} />
                      </div>
                      <div>
                        <strong>{box.boxNo}</strong>
                        <div className="muted">
                          {box.forecast.customer.companyName} / <WarehouseDateText value={box.scannedAt} />
                        </div>
                      </div>
                    </div>
                    <span className={`pill ${getStatusTone(box.exceptionResolution)}`}>
                      <WarehouseStatusText code={box.exceptionResolution} />
                    </span>
                  </div>

                  <div className="timeline-cluster">
                    <span className={`timeline-chip ${getStatusTone(box.anomalyType)}`}>
                      <CircleAlert size={14} strokeWidth={2} />
                      <WarehouseStatusText code={box.anomalyType} />
                    </span>
                    <span className={`timeline-chip ${getStatusTone(box.status)}`}>
                      <Boxes size={14} strokeWidth={2} />
                      <WarehouseStatusText code={box.status} />
                    </span>
                    <span className="timeline-chip">
                      <WarehouseText as="span" zh="重复件" en="Duplicates" es="Duplicados" /> {box.trackingScans.filter((item) => item.isDuplicate).length}
                    </span>
                  </div>

                  <div className="timeline-note">
                    <div className="detail-row">
                      <strong><WarehouseText as="span" zh="异常备注" en="Exception note" es="Nota de excepcion" /></strong>
                      {box.anomalyNote ? <WarehouseMessageText value={box.anomalyNote} /> : <span>-</span>}
                    </div>
                  </div>

                  <form action={resolveBoxExceptionAction} className="stacked">
                    <input type="hidden" name="forecastBoxId" value={box.id} />
                    <select name="resolution" defaultValue={box.exceptionResolution}>
                      <WarehouseText as="option" value="CONFIRMED_NORMAL" zh="已确认正常" en="Confirmed normal" es="Confirmado normal" />
                      <WarehouseText as="option" value="CUSTOMER_RESPONSIBLE" zh="客户责任" en="Customer responsibility" es="Responsabilidad del cliente" />
                      <WarehouseText as="option" value="WAREHOUSE_RESPONSIBLE" zh="仓库责任" en="Warehouse responsibility" es="Responsabilidad del almacen" />
                    </select>
                    <input name="note" defaultValue={box.exceptionResolutionNote || ""} />
                    <input
                      name="attachments"
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                      multiple
                    />
                    <div className="timeline-actions">
                      <button type="submit">
                        <WarehouseText as="span" zh="保存处理" en="Save resolution" es="Guardar resolucion" />
                      </button>
                      {box.exceptionRecords[0]?.attachments?.length ? (
                        <div className="timeline-cluster">
                          {box.exceptionRecords[0].attachments.map((attachment) => (
                            <a key={attachment.id} href={`/api/files/${attachment.fileAsset.id}`} target="_blank" className="button-link secondary">
                              <WarehouseText as="span" zh="附件" en="Attachment" es="Adjunto" /> {attachment.fileAsset.originalFilename}
                            </a>
                          ))}
                        </div>
                      ) : (
                        <WarehouseText as="span" className="muted" zh="暂无附件" en="No attachments" es="Sin adjuntos" />
                      )}
                    </div>
                  </form>
                </article>
              ))
            ) : (
              <WarehouseText as="div" className="muted" zh="当前没有待处理异常箱。" en="No pending exception boxes." es="No hay cajas pendientes." />
            )}
          </div>
        </section>

        <div className="split-grid">
          <section className="card soft">
            <div className="section-head">
              <div>
                <WarehouseText as="h3" zh="最近箱唛扫描" en="Recent label scans" es="Escaneos recientes de caja" />
                <WarehouseText as="p" className="muted" zh="保留箱号、客户、状态和复打入口，便于回查。" en="Keep box, client, status and reprint entry for quick review." es="Conserva caja, cliente, estado y reimpresion para revisar rapido." />
              </div>
            </div>
            <div className="timeline-list">
              {recentBoxes.length > 0 ? (
                recentBoxes.map((box) => (
                  <article key={box.id} className="timeline-item">
                    <div className="timeline-title-row">
                      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                        <div className="sidebar-profile-avatar">
                          <Boxes size={18} strokeWidth={2} />
                        </div>
                        <div>
                          <strong>{box.boxNo}</strong>
                          <div className="muted">{box.forecast.customer.companyName}</div>
                        </div>
                      </div>
                      <span className={`pill ${getStatusTone(box.status)}`}><WarehouseStatusText code={box.status} /></span>
                    </div>

                    <div className="timeline-cluster">
                      <span className="timeline-chip"><WarehouseText as="span" zh="预报件数" en="Expected" es="Esperado" /> {box.expectedOrderCount}</span>
                      <span className="timeline-chip">
                        <WarehouseText as="span" zh="有效件数" en="Valid scans" es="Validos" /> {box.trackingScans.filter((item) => !item.isDuplicate).length}
                      </span>
                      <span className="timeline-chip"><WarehouseText as="span" zh="扫描时间" en="Scanned at" es="Escaneado" /> <WarehouseDateText value={box.scannedAt} /></span>
                    </div>

                    <div className="timeline-actions">
                      <a href={`/api/boxes/${box.id}/label?layout=thermal_100x150`} target="_blank" className="button-link">
                        <QrCode size={14} strokeWidth={2} />
                        <WarehouseText as="span" zh="复打热敏纸" en="Reprint thermal" es="Reimprimir termica" />
                        <ArrowUpRight size={14} strokeWidth={2} />
                      </a>
                    </div>
                  </article>
                ))
              ) : (
                <WarehouseText as="div" className="muted" zh="暂无最近箱唛扫描记录。" en="No recent label scans." es="No hay escaneos recientes." />
              )}
            </div>
          </section>

          <section className="card soft">
            <div className="section-head">
              <div>
                <WarehouseText as="h3" zh="最近追踪号扫描" en="Recent tracking scans" es="Escaneos recientes de guia" />
                <WarehouseText as="p" className="muted" zh="有效件与重复件分开回看，方便追溯。" en="Review valid and duplicate scans separately." es="Revisa por separado validos y duplicados." />
              </div>
            </div>
            <div className="timeline-list">
              {recentTracking.length > 0 ? (
                recentTracking.map((item) => (
                  <article key={item.id} className="timeline-item">
                    <div className="timeline-title-row">
                      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                        <div className="sidebar-profile-avatar">
                          <ScanLine size={18} strokeWidth={2} />
                        </div>
                        <div>
                          <strong>{item.trackingNo}</strong>
                          <div className="muted">{item.forecastBox.forecast.customer.companyName}</div>
                        </div>
                      </div>
                      <span className={`pill ${item.isDuplicate ? "warning" : "success"}`}>
                        {item.isDuplicate ? (
                          <WarehouseText as="span" zh="重复件，已记录" en="Duplicate logged" es="Duplicado registrado" />
                        ) : (
                          <WarehouseText as="span" zh="有效件" en="Valid item" es="Valido" />
                        )}
                      </span>
                    </div>

                    <div className="timeline-cluster">
                      <span className="timeline-chip"><WarehouseText as="span" zh="箱号" en="Box" es="Caja" /> {item.forecastBox.boxNo}</span>
                      <span className="timeline-chip"><WarehouseDateText value={item.scannedAt} /></span>
                    </div>
                  </article>
                ))
              ) : (
                <WarehouseText as="div" className="muted" zh="暂无最近追踪号扫描记录。" en="No recent tracking scans." es="No hay guias recientes." />
              )}
            </div>
          </section>
        </div>
      </div>
    </Shell>
  );
}
