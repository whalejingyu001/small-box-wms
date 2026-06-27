import { CreditCard } from "lucide-react";
import { formatDate, formatMoney, formatStatusLabel, getStatusTone } from "@/lib/utils";
import type { getCustomerWorkspaceData } from "@/services/customer-workspace-service";

type CustomerWorkspaceData = Awaited<ReturnType<typeof getCustomerWorkspaceData>>;

export function CustomerRechargePanel({
  recharges,
  action
}: {
  recharges: CustomerWorkspaceData["recharges"];
  action: (formData: FormData) => Promise<void>;
}) {
  return (
    <div className="page-stack">
      <form action={action} className="card soft stacked">
        <div className="section-head">
          <div>
            <h3>提交充值申请</h3>
            <p className="muted">只填写支付渠道、金额和附件，提交后进入后台审核。</p>
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

      <section className="card soft">
        <div className="section-head">
          <div>
            <h3>充值记录</h3>
            <p className="muted">这里只看自己的充值申请、审核状态和附件。</p>
          </div>
        </div>

        <div className="timeline-list">
          {recharges.length > 0 ? (
            recharges.map((item) => (
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
            ))
          ) : (
            <div className="muted">当前还没有充值申请记录。</div>
          )}
        </div>
      </section>
    </div>
  );
}
