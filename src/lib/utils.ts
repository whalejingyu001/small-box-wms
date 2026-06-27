export function formatMoney(value: number | string, currency = "USD") {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency
  }).format(Number(value));
}

export function formatDate(value?: Date | string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function buildForecastNo(sequence: number) {
  return `PA${new Date().toISOString().slice(0, 10).replaceAll("-", "")}${String(sequence).padStart(4, "0")}`;
}

export function buildBoxNo(forecastNo: string, boxIndex: number) {
  return `${forecastNo}-B${String(boxIndex).padStart(3, "0")}`;
}

export function toDecimalInput(value?: string | number | null) {
  if (value === null || value === undefined) {
    return "";
  }
  return Number(value).toFixed(2);
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "启用",
  DISABLED: "停用",
  DRAFT: "草稿",
  SUBMITTED: "已提交",
  RECEIVING: "收货中",
  RECEIVED: "已收货",
  EXCEPTION: "有异常",
  CLOSED: "已关闭",
  PENDING: "待处理",
  LABEL_SCANNED: "已扫箱唛",
  VERIFYING: "复核中",
  VERIFIED: "复核完成",
  APPROVED: "已通过",
  REJECTED: "已驳回",
  RECHARGE: "充值",
  BOX_CHARGE: "按箱扣费",
  ITEM_CHARGE: "按件扣费",
  REVERSAL: "冲正",
  SUCCESS: "成功",
  FAILED: "失败",
  REVERSED: "已冲正",
  PER_BOX: "按箱计费",
  PER_ITEM: "按件计费",
  NORMAL: "正常",
  SHORTAGE: "少件",
  OVERAGE: "多件",
  DUPLICATE: "重复件",
  CONFIRMED_NORMAL: "已确认正常",
  CUSTOMER_RESPONSIBLE: "客户责任",
  WAREHOUSE_RESPONSIBLE: "仓库责任"
};

const STATUS_TONES: Record<string, string> = {
  ACTIVE: "success",
  APPROVED: "success",
  SUCCESS: "success",
  RECEIVED: "success",
  VERIFIED: "success",
  CONFIRMED_NORMAL: "success",
  SUBMITTED: "info",
  RECEIVING: "info",
  LABEL_SCANNED: "info",
  VERIFYING: "info",
  PER_BOX: "info",
  PER_ITEM: "info",
  PENDING: "warning",
  SHORTAGE: "warning",
  OVERAGE: "warning",
  DUPLICATE: "warning",
  EXCEPTION: "warning",
  REJECTED: "danger",
  FAILED: "danger",
  DISABLED: "danger",
  REVERSED: "danger",
  WAREHOUSE_RESPONSIBLE: "danger",
  CUSTOMER_RESPONSIBLE: "danger"
};

export function formatStatusLabel(value?: string | null) {
  if (!value) {
    return "-";
  }
  return STATUS_LABELS[value] || value;
}

export function getStatusTone(value?: string | null) {
  if (!value) {
    return "default";
  }
  return STATUS_TONES[value] || "default";
}
