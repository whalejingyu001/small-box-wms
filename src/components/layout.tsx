"use client";

import { useEffect, useState } from "react";
import type { Route } from "next";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Archive,
  Building2,
  ChartColumn,
  CircleAlert,
  CircleDollarSign,
  LayoutGrid,
  LogOut,
  MonitorCog,
  PackageSearch,
  Search,
  Sun,
  MoonStar,
  UserRound
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserRole } from "@prisma/client";
import { logoutAction } from "@/server/actions";
import { type SessionUser } from "@/lib/auth";
import { useTheme } from "@/components/theme-provider";
import {
  WarehouseLocaleContext,
  WAREHOUSE_LOCALE_COOKIE,
  type WarehouseLocale,
  pickWarehouseText
} from "@/components/warehouse-locale";

type ShellRoute =
  | "/"
  | "/admin"
  | "/admin/accounts"
  | "/admin/customers"
  | "/admin/statements"
  | "/admin/finance"
  | "/admin/recharges"
  | "/admin/transactions"
  | "/admin/reports"
  | "/admin/archives"
  | "/admin/exceptions"
  | "/warehouse"
  | "/warehouse/exceptions"
  | "/customer"
  | "/customer/forecasts"
  | "/customer/recharge"
  | "/customer/statements";

type NavItem = {
  href: ShellRoute;
  label: string;
  shortLabel: string;
  description: string;
  icon: LucideIcon;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const HOME_ENTRY: NavItem = {
  href: "/",
  label: "系统首页",
  shortLabel: "首",
  description: "总览入口",
  icon: LayoutGrid
};

function getPathLabel(pathname: string) {
  if (pathname.startsWith("/admin/customers/")) {
    return pathname.endsWith("/workspace") ? "客户界面预览" : "客户详情";
  }

  const labelMap: Record<string, string> = {
    "/": "系统首页",
    "/admin": "管理后台",
    "/admin/accounts": "账号管理",
    "/admin/customers": "客户列表",
    "/admin/statements": "客户对账单",
    "/admin/finance": "客户报价中心",
    "/admin/recharges": "充值审核",
    "/admin/transactions": "资金流水",
    "/admin/reports": "财务报表",
    "/admin/archives": "财务归档中心",
    "/admin/exceptions": "异常历史",
    "/warehouse": "仓库操作端",
    "/warehouse/exceptions": "仓库异常历史",
    "/customer": "预报填写",
    "/customer/forecasts": "预报列表",
    "/customer/recharge": "提交充值",
    "/customer/statements": "我的对账单"
  };

  return labelMap[pathname] ?? pathname;
}

function getWarehousePageLabel(pathname: string, locale: WarehouseLocale) {
  const labelMap: Record<string, string> = {
    "/": pickWarehouseText(locale, "系统首页", "Home", "Inicio"),
    "/warehouse": pickWarehouseText(locale, "仓库操作端", "Warehouse Desk", "Mesa de almacen"),
    "/warehouse/exceptions": pickWarehouseText(locale, "异常历史", "Exception History", "Historial de excepciones")
  };

  return labelMap[pathname] ?? pathname;
}

export function Shell({
  session,
  initialWarehouseLocale = "zh",
  children
}: {
  session: SessionUser;
  initialWarehouseLocale?: WarehouseLocale;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const isWarehouse = session.role === UserRole.WAREHOUSE_OPERATOR;
  const isAdmin = session.role === UserRole.ADMIN;
  const [warehouseLocale, setWarehouseLocale] = useState<WarehouseLocale>(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem("warehouse-locale");
      if (saved === "zh" || saved === "en" || saved === "es") {
        return saved;
      }
    }

    return initialWarehouseLocale;
  });

  useEffect(() => {
    if (!isWarehouse || typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem("warehouse-locale", warehouseLocale);
    document.cookie = `${WAREHOUSE_LOCALE_COOKIE}=${warehouseLocale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  }, [isWarehouse, warehouseLocale]);

  useEffect(() => {
    if (!isWarehouse || typeof window === "undefined") {
      return;
    }

    const saved = window.localStorage.getItem("warehouse-locale");
    if ((saved === "zh" || saved === "en" || saved === "es") && saved !== warehouseLocale) {
      setWarehouseLocale(saved);
    }
  }, [isWarehouse, pathname, warehouseLocale]);

  const wh = (zh: string, en: string, es: string) => pickWarehouseText(warehouseLocale, zh, en, es);
  const persistWarehouseLocale = (locale: WarehouseLocale) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("warehouse-locale", locale);
      document.cookie = `${WAREHOUSE_LOCALE_COOKIE}=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    }
    setWarehouseLocale(locale);
  };

  const navSections: NavSection[] =
    session.role === UserRole.ADMIN
      ? [
          {
            title: "总览",
            items: [
              {
                href: "/admin",
                label: "管理后台",
                shortLabel: "管",
                description: "经营总览",
                icon: Activity
              },
              {
                href: "/admin/customers",
                label: "客户列表",
                shortLabel: "客",
                description: "客户与预览",
                icon: Building2
              },
              {
                href: "/admin/accounts",
                label: "账号管理",
                shortLabel: "号",
                description: "仓库与管理账号",
                icon: UserRound
              }
            ]
          },
          {
            title: "财务",
            items: [
              {
                href: "/admin/statements",
                label: "客户对账单",
                shortLabel: "账",
                description: "账单与导出",
                icon: CircleDollarSign
              },
              {
                href: "/admin/finance",
                label: "客户报价中心",
                shortLabel: "价",
                description: "计费与报价",
                icon: ChartColumn
              },
              {
                href: "/admin/recharges",
                label: "充值审核",
                shortLabel: "审",
                description: "审核与记录",
                icon: CircleDollarSign
              },
              {
                href: "/admin/transactions",
                label: "资金流水",
                shortLabel: "流",
                description: "流水与冲正",
                icon: ChartColumn
              },
              {
                href: "/admin/reports",
                label: "财务报表",
                shortLabel: "报",
                description: "收入与利润",
                icon: ChartColumn
              },
              {
                href: "/admin/archives",
                label: "财务归档中心",
                shortLabel: "档",
                description: "归档记录",
                icon: Archive
              }
            ]
          },
          {
            title: "运营",
            items: [
              {
                href: "/admin/exceptions",
                label: "异常历史",
                shortLabel: "异",
                description: "异常闭环",
                icon: CircleAlert
              }
            ]
          }
        ]
      : session.role === UserRole.WAREHOUSE_OPERATOR
        ? [
            {
              title: "工作台",
              items: [
                {
                  href: "/warehouse",
                  label: wh("仓库操作端", "Warehouse", "Almacen"),
                  shortLabel: "仓",
                  description: wh("扫码作业", "Scan flow", "Flujo de escaneo"),
                  icon: PackageSearch
                },
                {
                  href: "/warehouse/exceptions",
                  label: wh("异常历史", "Exceptions", "Excepciones"),
                  shortLabel: "异",
                  description: wh("异常记录", "Issue log", "Registro"),
                  icon: CircleAlert
                }
              ]
            }
          ]
        : [
            {
              title: "客户端",
              items: [
                {
                  href: "/customer",
                  label: "预报填写",
                  shortLabel: "客",
                  description: "新建预报",
                  icon: UserRound
                },
                {
                  href: "/customer/forecasts",
                  label: "预报列表",
                  shortLabel: "预",
                  description: "导出箱唛",
                  icon: PackageSearch
                },
                {
                  href: "/customer/recharge",
                  label: "提交充值",
                  shortLabel: "充",
                  description: "上传凭证",
                  icon: CircleDollarSign
                },
                {
                  href: "/customer/statements",
                  label: "我的对账单",
                  shortLabel: "账",
                  description: "账单导出",
                  icon: CircleDollarSign
                }
              ]
            }
          ];

  const roleLabel =
    session.role === UserRole.ADMIN
      ? "管理员"
      : session.role === UserRole.WAREHOUSE_OPERATOR
        ? wh("仓库操作员", "Warehouse Operator", "Operador")
        : "客户账号";
  const warehouseBrandTitle = wh("小包系统", "Parcel WMS", "WMS de Paqueteria");
  const currentPageLabel = isWarehouse ? getWarehousePageLabel(pathname, warehouseLocale) : getPathLabel(pathname);
  const brandKicker = isWarehouse ? wh("仓库工作区", "Warehouse Hub", "Centro de almacen") : "运营中枢";
  const brandSubline = isWarehouse
    ? wh("扫码 · 异常 · 历史", "Scan · Exceptions · History", "Escaneo · Excepciones · Historial")
    : isAdmin
      ? "客户、财务、异常统一管理"
      : "预报、充值、对账统一入口";
  const liveLabel = isWarehouse ? wh("在线工作区", "Workspace Live", "Espacio activo") : "工作区在线";
  const themeModeLabel = resolvedTheme === "dark" ? (isWarehouse ? wh("深色", "Dark", "Oscuro") : "深色") : (isWarehouse ? wh("浅色", "Light", "Claro") : "浅色");
  const themeTitle = isWarehouse ? wh("界面主题", "Theme", "Tema") : "界面主题";
  const themeDesc = isWarehouse
    ? wh("支持浅色、深色和跟随系统", "Light, dark or follow system", "Claro, oscuro o seguir sistema")
    : "支持浅色、深色和跟随系统";
  const themeLightLabel = isWarehouse ? wh("浅色", "Light", "Claro") : "浅色";
  const themeDarkLabel = isWarehouse ? wh("深色", "Dark", "Oscuro") : "深色";
  const themeSystemLabel = isWarehouse ? wh("跟随", "System", "Sistema") : "跟随";
  const themeNote = isWarehouse
    ? `${wh("当前生效", "Active", "Activo")}：${resolvedTheme === "dark" ? wh("深色模式", "Dark mode", "Modo oscuro") : wh("浅色模式", "Light mode", "Modo claro")}`
    : `当前生效：${resolvedTheme === "dark" ? "深色模式" : "浅色模式"}`;
  const homeLabel = isWarehouse ? wh("系统首页", "Home", "Inicio") : "系统首页";
  const homeMeta = isWarehouse ? wh("入口与重点", "Entry and focus", "Entrada y foco") : "入口与重点";
  const currentViewTitle = isWarehouse ? wh("当前视图", "Current view", "Vista actual") : "当前视图";
  const currentViewMeta = isWarehouse ? wh("当前页面定位", "Page position", "Posicion actual") : "当前页面定位";
  const workspaceTitle = isWarehouse ? wh("当前工作区", "Current workspace", "Espacio actual") : "当前工作区";
  const searchTitle = isWarehouse ? wh("快速搜索", "Quick search", "Busqueda rapida") : "快速搜索";
  const searchPlaceholder = isWarehouse ? wh("搜索占位", "Search placeholder", "Busqueda") : "搜索占位";
  const searchAria = isWarehouse ? wh("搜索占位", "Search placeholder", "Busqueda") : "搜索占位";
  const healthLabel = session.customerId
    ? isWarehouse
      ? wh("客户已绑定", "Customer linked", "Cliente vinculado")
      : "客户已绑定"
    : isWarehouse
      ? wh("系统会话正常", "Session healthy", "Sesion activa")
      : "系统会话正常";
  const shellMotto = isWarehouse ? wh("统一视觉，不改业务", "Unified UI, same workflow", "UI unificada, mismo flujo") : "统一视觉，不改业务。";
  const loginState = session.customerId
    ? isWarehouse
      ? wh("客户已绑定", "Customer linked", "Cliente vinculado")
      : "客户已绑定"
    : isWarehouse
      ? wh("当前会话已登录", "Session signed in", "Sesion iniciada")
      : "当前会话已登录";
  const logoutLabel = isWarehouse ? wh("退出登录", "Sign out", "Cerrar sesion") : "退出登录";
  const profileTitle = isWarehouse ? roleLabel : session.name;
  const profileSubtitle = isWarehouse ? session.username : roleLabel;
  const profileAvatarLabel = isWarehouse ? roleLabel.slice(0, 1).toUpperCase() : session.name.slice(0, 1).toUpperCase();
  const warehouseNavSectionTitle = wh("工作台", "Workspace", "Espacio de trabajo");
  const languageSwitcherAria = isWarehouse ? wh("语言切换", "Language switcher", "Selector de idioma") : "语言切换";
  const lightThemeAria = isWarehouse ? wh("切换浅色模式", "Switch to light mode", "Cambiar a modo claro") : "切换浅色模式";
  const darkThemeAria = isWarehouse ? wh("切换深色模式", "Switch to dark mode", "Cambiar a modo oscuro") : "切换深色模式";
  const systemThemeAria = isWarehouse ? wh("跟随系统主题", "Follow system theme", "Seguir tema del sistema") : "跟随系统主题";

  return (
    <WarehouseLocaleContext.Provider value={{ locale: warehouseLocale, setLocale: persistWarehouseLocale }}>
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-panel">
          <div className="sidebar-brand">
            <div className="brand-mark-row">
              <div className="brand-mark" aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
              </div>
              <div className="brand-copy">
                <div className="brand-kicker">{brandKicker}</div>
                <h1>{isWarehouse ? warehouseBrandTitle : "小包系统"}</h1>
                <div className="brand-subline">{brandSubline}</div>
              </div>
            </div>
            <div className="brand-pill-row">
              <span className="status-chip info">{roleLabel}</span>
              <span className="status-chip success">{liveLabel}</span>
              <span className="status-chip">{themeModeLabel}</span>
            </div>
          </div>

          <div className="theme-switcher card soft">
            <div className="theme-switcher-label">
              <strong>{themeTitle}</strong>
              <span className="muted">{themeDesc}</span>
            </div>
            <div className="theme-switcher-group" role="tablist" aria-label="主题切换">
              <button
                type="button"
                className={theme === "light" ? "theme-option active" : "theme-option"}
                onClick={() => setTheme("light")}
                aria-pressed={theme === "light"}
              >
                <Sun size={15} strokeWidth={2} />
                {themeLightLabel}
              </button>
              <button
                type="button"
                className={theme === "dark" ? "theme-option active" : "theme-option"}
                onClick={() => setTheme("dark")}
                aria-pressed={theme === "dark"}
              >
                <MoonStar size={15} strokeWidth={2} />
                {themeDarkLabel}
              </button>
              <button
                type="button"
                className={theme === "system" ? "theme-option active" : "theme-option"}
                onClick={() => setTheme("system")}
                aria-pressed={theme === "system"}
              >
                <MonitorCog size={15} strokeWidth={2} />
                {themeSystemLabel}
              </button>
            </div>
            {isWarehouse ? (
              <div className="theme-switcher-group" role="tablist" aria-label={languageSwitcherAria}>
                {([
                  ["zh", "中文"],
                  ["en", "English"],
                  ["es", "Español"]
                ] as const).map(([locale, label]) => (
                  <button
                    key={locale}
                    type="button"
                    className={warehouseLocale === locale ? "theme-option active" : "theme-option"}
                    onClick={() => persistWarehouseLocale(locale)}
                    aria-pressed={warehouseLocale === locale}
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : null}
            <div className="theme-switcher-note muted">{themeNote}</div>
          </div>

          <div className="sidebar-profile card soft">
            <div className="sidebar-profile-avatar">{profileAvatarLabel}</div>
            <div className="sidebar-profile-copy">
              <strong>{profileTitle}</strong>
              <span className="muted">{profileSubtitle}</span>
              <span className="muted">{loginState}</span>
            </div>
          </div>

          <nav className="sidebar-nav">
            <Link
              href={"/" as Route}
              className={pathname === "/" ? "sidebar-link active" : "sidebar-link"}
            >
              <span className="sidebar-link-icon">
                <HOME_ENTRY.icon size={16} strokeWidth={2} />
              </span>
              <span className="sidebar-link-label">{homeLabel}</span>
              <span className="sidebar-link-meta">{homeMeta}</span>
            </Link>

            {navSections.map((section) => (
              <div key={section.title} className="sidebar-nav-group">
                <div className="sidebar-nav-title">
                  {isWarehouse ? warehouseNavSectionTitle : section.title}
                </div>
                <div className="sidebar-nav-links">
                  {section.items.map((item) => {
                    const active =
                      pathname === item.href ||
                      (item.href !== "/" && pathname.startsWith(`${item.href}/`));

                    return (
                      <Link
                        key={item.href}
                        href={item.href as Route}
                        className={active ? "sidebar-link active" : "sidebar-link"}
                      >
                        <span className="sidebar-link-icon">
                          <item.icon size={16} strokeWidth={2} />
                        </span>
                        <span className="sidebar-link-label">{item.label}</span>
                        <span className="sidebar-link-meta">{item.description}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="sidebar-footer">
            <div className="sidebar-hint">
              <div className="sidebar-nav-title">{currentViewTitle}</div>
              <strong>{currentPageLabel}</strong>
              <div className="muted">{currentViewMeta}</div>
            </div>
            <form action={logoutAction}>
              <button type="submit" className="warning sidebar-logout">
                <LogOut size={16} strokeWidth={2} />
                {logoutLabel}
              </button>
            </form>
          </div>
        </div>
      </aside>

      <main className="content">
        <div className="content-shell">
          <div className="content-topbar">
            <div className="content-topbar-main">
              <div>
                <div className="content-topbar-title">{workspaceTitle}</div>
                <strong>{currentPageLabel}</strong>
                <div className="content-topbar-meta muted">{roleLabel}</div>
              </div>
              <div className="topbar-actions">
                <label className="topbar-search">
                  <span>{searchTitle}</span>
                  <div className="topbar-search-field">
                    <Search size={16} strokeWidth={2} />
                    <input
                      value=""
                      readOnly
                      placeholder={`${searchPlaceholder} · ${roleLabel}`}
                      aria-label={searchAria}
                    />
                  </div>
                </label>
                <div className="theme-switcher-inline">
                  <button
                    type="button"
                    className={theme === "light" ? "theme-icon active" : "theme-icon"}
                    onClick={() => setTheme("light")}
                    aria-label={lightThemeAria}
                  >
                    <Sun size={16} strokeWidth={2} />
                  </button>
                  <button
                    type="button"
                    className={theme === "dark" ? "theme-icon active" : "theme-icon"}
                    onClick={() => setTheme("dark")}
                    aria-label={darkThemeAria}
                  >
                    <MoonStar size={16} strokeWidth={2} />
                  </button>
                  <button
                    type="button"
                    className={theme === "system" ? "theme-icon active" : "theme-icon"}
                    onClick={() => setTheme("system")}
                    aria-label={systemThemeAria}
                  >
                    <MonitorCog size={16} strokeWidth={2} />
                  </button>
                </div>
              </div>
            </div>

            <div className="content-topbar-tools">
              <div className="content-topbar-pills">
                <span className="status-chip info">{roleLabel}</span>
                <span className="status-chip warning">{currentPageLabel}</span>
                <span className="status-chip success">{healthLabel}</span>
              </div>
              <div className="muted">{shellMotto}</div>
            </div>
          </div>

          <div className="content-body">{children}</div>
        </div>
      </main>
    </div>
    </WarehouseLocaleContext.Provider>
  );
}
