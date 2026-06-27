import {
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  Boxes
} from "lucide-react";
import { loginAction } from "@/server/actions";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="login-shell">
      <div className="login-backdrop">
        <section className="card soft login-showcase">
          <div className="stacked login-showcase-stack" style={{ gap: "1.25rem" }}>
            <div className="hero-badges">
              <span className="pill">
                <Sparkles size={14} />
                统一工作台
              </span>
              <span className="status-chip info">轻仪表盘</span>
              <span className="status-chip warning">玻璃系统</span>
            </div>

            <div className="compact-item login-hero-panel login-hero-motion">
              <div className="login-hero-panel-glow" />
              <div className="row-between login-motion-head" style={{ alignItems: "flex-start" }}>
                <div className="login-hero-mark">
                  <Boxes size={24} />
                </div>
                <span className="status-chip success">
                  <ShieldCheck size={14} />
                  Live
                </span>
              </div>

              <div className="login-motion-stage" aria-hidden="true">
                <div className="login-motion-center">
                  <div className="login-motion-core">WMS</div>
                </div>
                <div className="login-motion-ring login-motion-ring-1" />
                <div className="login-motion-ring login-motion-ring-2" />
                <div className="login-motion-ring login-motion-ring-3" />

                <div className="login-motion-node login-motion-node-a">
                  <span className="login-motion-node-dot" />
                  <strong>Client</strong>
                  <small>Forecast</small>
                </div>
                <div className="login-motion-node login-motion-node-b">
                  <span className="login-motion-node-dot" />
                  <strong>Warehouse</strong>
                  <small>Scan</small>
                </div>
                <div className="login-motion-node login-motion-node-c">
                  <span className="login-motion-node-dot" />
                  <strong>Admin</strong>
                  <small>Finance</small>
                </div>

                <div className="login-motion-orbit login-motion-orbit-1">
                  <span className="login-orbit-particle login-orbit-particle-a" />
                </div>
                <div className="login-motion-orbit login-motion-orbit-2">
                  <span className="login-orbit-particle login-orbit-particle-b" />
                </div>

                <div className="login-scan-lane login-scan-lane-a" />
                <div className="login-scan-lane login-scan-lane-b" />
                <div className="login-scan-pulse login-scan-pulse-a" />
                <div className="login-scan-pulse login-scan-pulse-b" />
              </div>

              <div className="login-metric-strip" aria-hidden="true">
                <div className="login-metric-chip">
                  <span className="login-metric-label">Forecast</span>
                  <span className="login-metric-bar login-metric-bar-a" />
                </div>
                <div className="login-metric-chip">
                  <span className="login-metric-label">Scan</span>
                  <span className="login-metric-bar login-metric-bar-b" />
                </div>
                <div className="login-metric-chip">
                  <span className="login-metric-label">Billing</span>
                  <span className="login-metric-bar login-metric-bar-c" />
                </div>
                <div className="login-metric-chip">
                  <span className="login-metric-label">Archive</span>
                  <span className="login-metric-bar login-metric-bar-d" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          className="card login-card login-card-shell"
        >
          <div
            className="compact-item login-form-panel"
          >
            <div className="login-card-head">
              <span className="pill">
                <ShieldCheck size={14} />
                安全登录
              </span>
              <h2>登录工作台</h2>
              <p className="muted">使用现有账号进入对应工作区。</p>
            </div>

            <form action={loginAction} className="stacked" style={{ gap: "0.95rem" }}>
              <label className="field">
                <span>账号</span>
                <input name="username" placeholder="请输入账号" required />
              </label>

              <label className="field">
                <span>密码</span>
                <input name="password" type="password" placeholder="请输入密码" required />
              </label>

              <button type="submit">
                进入系统
                <ArrowRight size={16} />
              </button>

              {params.error ? <p className="danger">账号或密码错误，或客户状态不可用。</p> : null}
            </form>
          </div>

          <div className="grid two">
            <div className="compact-item" style={{ borderRadius: 26 }}>
              <span className="pill">角色入口</span>
              <strong style={{ fontSize: "1.1rem" }}>多角色入口</strong>
              <span className="muted">管理员、仓库、客户共用同一入口。</span>
            </div>
            <div className="compact-item" style={{ borderRadius: 26 }}>
              <span className="pill">系统状态</span>
              <strong style={{ fontSize: "1.1rem" }}>现有功能保留</strong>
              <span className="muted">只改界面，不改提交、鉴权和跳转。</span>
            </div>
          </div>

          <div className="credential-list">
            <div className="credential-item">
              <div className="row-between">
                <strong>管理员</strong>
                <CheckCircle2 size={16} className="success" />
              </div>
              <code>admin / Admin123!</code>
            </div>
            <div className="credential-item">
              <div className="row-between">
                <strong>仓库账号</strong>
                <CheckCircle2 size={16} className="success" />
              </div>
              <code>warehouse / Warehouse123!</code>
            </div>
            <div className="credential-item">
              <div className="row-between">
                <strong>客户账号</strong>
                <CheckCircle2 size={16} className="success" />
              </div>
              <code>demo_customer / Demo123!</code>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
