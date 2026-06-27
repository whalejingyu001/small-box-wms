"use client";

import { createContext, useContext } from "react";
import type { ComponentPropsWithoutRef, ElementType } from "react";

export type WarehouseLocale = "zh" | "en" | "es";
export const WAREHOUSE_LOCALE_COOKIE = "warehouse-locale";

export const WarehouseLocaleContext = createContext<{
  locale: WarehouseLocale;
  setLocale: (locale: WarehouseLocale) => void;
}>({
  locale: "zh",
  setLocale: () => {}
});

export function useWarehouseLocale() {
  return useContext(WarehouseLocaleContext);
}

export function pickWarehouseText(locale: WarehouseLocale, zh: string, en: string, es: string) {
  if (locale === "en") {
    return en;
  }

  if (locale === "es") {
    return es;
  }

  return zh;
}

function sanitizeWarehouseMessage(message: string) {
  return message
    .replaceAll("扫追踪号成功并扣费", "扫追踪号成功")
    .replaceAll("重复件，不扣费", "重复件，已记录")
    .replaceAll("重复不扣费", "重复件")
    .replaceAll("余额不足", "客户账户受限");
}

export function translateWarehouseMessageText(
  locale: WarehouseLocale,
  rawMessage: string,
  fallback?: string
) {
  const message = sanitizeWarehouseMessage(rawMessage || fallback || "");

  const duplicateWithTracking = message.match(/^重复件，已记录：(.+)$/);
  if (duplicateWithTracking) {
    return pickWarehouseText(
      locale,
      `重复件，已记录：${duplicateWithTracking[1]}`,
      `Duplicate logged: ${duplicateWithTracking[1]}`,
      `Duplicado registrado: ${duplicateWithTracking[1]}`
    );
  }

  const shortageMatch = message.match(/^实扫\s*(\d+)，少于预报\s*(\d+)$/);
  if (shortageMatch) {
    return pickWarehouseText(
      locale,
      `实扫 ${shortageMatch[1]}，少于预报 ${shortageMatch[2]}`,
      `Scanned ${shortageMatch[1]}, below forecast ${shortageMatch[2]}`,
      `Escaneado ${shortageMatch[1]}, por debajo del preaviso ${shortageMatch[2]}`
    );
  }

  const overageMatch = message.match(/^实扫\s*(\d+)，大于预报\s*(\d+)$/);
  if (overageMatch) {
    return pickWarehouseText(
      locale,
      `实扫 ${overageMatch[1]}，大于预报 ${overageMatch[2]}`,
      `Scanned ${overageMatch[1]}, above forecast ${overageMatch[2]}`,
      `Escaneado ${overageMatch[1]}, por encima del preaviso ${overageMatch[2]}`
    );
  }

  const dictionary: Record<string, [string, string, string]> = {
    "扫箱成功": ["扫箱成功", "Box scanned successfully", "Caja escaneada correctamente"],
    "扫箱成功，进入追踪号扫描模式": [
      "扫箱成功，进入追踪号扫描模式",
      "Box scanned, now enter tracking scan mode",
      "Caja escaneada, ahora entra al modo de guias"
    ],
    "扫追踪号成功": ["扫追踪号成功", "Tracking scanned successfully", "Guia escaneada correctamente"],
    "重复件，已记录": ["重复件，已记录", "Duplicate item, not charged", "Pieza duplicada, no se cobra"],
    "客户账户受限": ["客户账户受限", "Customer balance limited", "Cuenta del cliente limitada"],
    "箱号不存在": ["箱号不存在", "Box number not found", "No existe el numero de caja"],
    "扫描失败": ["扫描失败", "Scan failed", "Fallo al escanear"],
    "当前箱已结束": ["当前箱已结束", "Current box finished", "Caja actual finalizada"],
    "当前箱已完成": ["当前箱已完成", "Current box completed", "Caja actual completada"],
    "当前箱结束": ["当前箱结束", "Current box closed", "Caja actual cerrada"],
    "结束当前箱失败": ["结束当前箱失败", "Failed to finish box", "No se pudo finalizar la caja"],
    "异常已处理": ["异常已处理", "Exception resolved", "Excepcion resuelta"],
    "异常已处理，当前箱恢复正常": [
      "异常已处理，当前箱恢复正常",
      "Exception resolved, box restored to normal",
      "Excepcion resuelta, la caja vuelve a normal"
    ],
    "异常处理失败": ["异常处理失败", "Failed to resolve exception", "No se pudo resolver la excepcion"],
    "异常箱不存在": ["异常箱不存在", "Exception box not found", "No existe la caja con excepcion"],
    "箱子不存在": ["箱子不存在", "Box not found", "Caja no encontrada"],
    "已重新选择箱": ["已重新选择箱", "Box selection reset", "Caja restablecida"],
    "扫描数量与预报一致": [
      "扫描数量与预报一致",
      "Scanned count matches forecast",
      "La cantidad escaneada coincide con el preaviso"
    ],
    "等待扫描": ["等待扫描", "Waiting for scan", "Esperando escaneo"],
    NORMAL: ["正常", "Normal", "Normal"],
    LABEL_SCANNED: ["已扫箱唛", "Label scanned", "Etiqueta escaneada"],
    VERIFIED: ["已复核", "Verified", "Verificado"],
    EXCEPTION: ["异常", "Exception", "Excepcion"],
    SHORTAGE: ["少件", "Shortage", "Faltante"],
    OVERAGE: ["多件", "Overage", "Exceso"],
    DUPLICATE: ["重复件", "Duplicate", "Duplicado"],
    CONFIRMED_NORMAL: ["已确认正常", "Confirmed normal", "Confirmado normal"],
    CUSTOMER_RESPONSIBLE: ["客户责任", "Customer responsibility", "Responsabilidad del cliente"],
    WAREHOUSE_RESPONSIBLE: ["仓库责任", "Warehouse responsibility", "Responsabilidad del almacen"]
  };

  if (dictionary[message]) {
    const [zh, en, es] = dictionary[message];
    return pickWarehouseText(locale, zh, en, es);
  }

  return pickWarehouseText(
    locale,
    message || fallback || "",
    message || fallback || "",
    message || fallback || ""
  );
}

function toIntlLocale(locale: WarehouseLocale) {
  if (locale === "en") {
    return "en-US";
  }

  if (locale === "es") {
    return "es-ES";
  }

  return "zh-CN";
}

export function formatWarehouseDate(
  locale: WarehouseLocale,
  value: string | number | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }
) {
  if (!value) {
    return "-";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return typeof value === "string" ? value : "-";
  }

  return new Intl.DateTimeFormat(toIntlLocale(locale), options).format(date);
}

type WarehouseDateTextProps<T extends ElementType> = {
  as?: T;
  value: string | number | Date | null | undefined;
  options?: Intl.DateTimeFormatOptions;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "children">;

export function WarehouseDateText<T extends ElementType = "span">({
  as,
  value,
  options,
  ...props
}: WarehouseDateTextProps<T>) {
  const Tag = (as || "span") as ElementType;
  const { locale } = useWarehouseLocale();

  return <Tag {...props}>{formatWarehouseDate(locale, value, options)}</Tag>;
}

type WarehouseMessageTextProps<T extends ElementType> = {
  as?: T;
  value: string | null | undefined;
  fallback?: string;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "children">;

export function WarehouseMessageText<T extends ElementType = "span">({
  as,
  value,
  fallback,
  ...props
}: WarehouseMessageTextProps<T>) {
  const Tag = (as || "span") as ElementType;
  const { locale } = useWarehouseLocale();

  return <Tag {...props}>{translateWarehouseMessageText(locale, value || "", fallback)}</Tag>;
}

type WarehouseTextProps<T extends ElementType> = {
  as?: T;
  zh: string;
  en: string;
  es: string;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "children">;

export function WarehouseText<T extends ElementType = "span">({
  as,
  zh,
  en,
  es,
  ...props
}: WarehouseTextProps<T>) {
  const Tag = (as || "span") as ElementType;
  const { locale } = useWarehouseLocale();

  return <Tag {...props}>{pickWarehouseText(locale, zh, en, es)}</Tag>;
}
