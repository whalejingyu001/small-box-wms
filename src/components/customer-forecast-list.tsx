import { ArrowUpRight, Boxes } from "lucide-react";
import { formatDate, formatStatusLabel, getStatusTone } from "@/lib/utils";
import type { getCustomerWorkspaceData } from "@/services/customer-workspace-service";

type CustomerWorkspaceData = Awaited<ReturnType<typeof getCustomerWorkspaceData>>;

export function CustomerForecastList({
  forecasts,
  simple = false
}: {
  forecasts: CustomerWorkspaceData["forecasts"];
  simple?: boolean;
}) {
  return (
    <section className="card soft">
      <div className="section-head">
        <div>
          <h3>预报列表</h3>
          <p className="muted">
            {simple
              ? "这里只保留预报号、状态和箱唛导出，方便客户快速回看。"
              : "按时间顺序查看预报记录，直接导出 A4、热敏纸或单箱箱唛。"}
          </p>
        </div>
      </div>

      <div className="timeline-list">
        {forecasts.length > 0 ? (
          forecasts.map((forecast) => (
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
          ))
        ) : (
          <div className="muted">当前还没有预报记录。</div>
        )}
      </div>
    </section>
  );
}
