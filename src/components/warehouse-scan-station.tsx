"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  formatWarehouseDate,
  pickWarehouseText,
  translateWarehouseMessageText,
  useWarehouseLocale
} from "@/components/warehouse-locale";

type ScanContext = {
  boxId: string;
  boxNo: string;
  customerName: string;
  customerId: string;
  forecastNo: string;
  billingMode: "PER_BOX" | "PER_ITEM";
  expectedOrderCount: number;
  validCount: number;
  duplicateCount: number;
  chargeAmount: number;
  anomalyType: string;
  anomalyNote: string | null;
  status: string;
  exceptionResolution: string;
  exceptionResolutionNote: string | null;
  recentTrackingScans: Array<{
    id: string;
    trackingNo: string;
    isDuplicate: boolean;
    scannedAt: string;
  }>;
};

type ScanResultLog = {
  id: string;
  text: string;
  rawText?: string;
  level: "success" | "duplicate" | "warning" | "balance" | "error";
  createdAt: string;
};

const STORAGE_CONTEXT_KEY = "warehouse-scan-current-box";
const STORAGE_LOGS_KEY = "warehouse-scan-logs";
const STORAGE_SOUND_KEY = "warehouse-scan-sound";
const STORAGE_FONT_KEY = "warehouse-scan-big-font";

function playTone(kind: ScanResultLog["level"]) {
  if (typeof window === "undefined") {
    return;
  }

  const audioContext = new window.AudioContext();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  const presets: Record<ScanResultLog["level"], { frequency: number; duration: number }> = {
    success: { frequency: 880, duration: 0.12 },
    duplicate: { frequency: 520, duration: 0.2 },
    warning: { frequency: 420, duration: 0.24 },
    balance: { frequency: 240, duration: 0.3 },
    error: { frequency: 180, duration: 0.35 }
  };

  oscillator.type = kind === "success" ? "sine" : "square";
  oscillator.frequency.value = presets[kind].frequency;
  gainNode.gain.value = 0.05;
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + presets[kind].duration);
  oscillator.onended = () => {
    void audioContext.close();
  };
}

function getLevelFromMessage(message: string, hasError = false): ScanResultLog["level"] {
  if (hasError) {
    if (message.includes("余额不足")) {
      return "balance";
    }
    return "error";
  }

  if (message.includes("重复")) {
    return "duplicate";
  }

  if (message.includes("少于") || message.includes("大于") || message.includes("异常")) {
    return "warning";
  }

  return "success";
}

function pushRecentLog(
  setLogs: React.Dispatch<React.SetStateAction<ScanResultLog[]>>,
  text: string,
  level: ScanResultLog["level"],
  soundEnabled: boolean,
  rawText?: string
) {
  if (soundEnabled) {
    playTone(level);
  }

  setLogs((prev) => {
    const next = [
      {
        id: `${Date.now()}-${Math.random()}`,
        text,
        rawText: rawText || text,
        level,
        createdAt: new Date().toISOString()
      },
      ...prev
    ].slice(0, 20);
    window.localStorage.setItem(STORAGE_LOGS_KEY, JSON.stringify(next));
    return next;
  });
}

export function WarehouseScanStation() {
  const { locale } = useWarehouseLocale();
  const inputRef = useRef<HTMLInputElement>(null);
  const attachmentRef = useRef<HTMLInputElement>(null);
  const stationRef = useRef<HTMLDivElement>(null);
  const [continuousMode, setContinuousMode] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [bigFontMode, setBigFontMode] = useState(false);
  const [fullscreenMode, setFullscreenMode] = useState(false);
  const [currentBox, setCurrentBox] = useState<ScanContext | null>(null);
  const [fixedBox, setFixedBox] = useState<ScanContext | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [logs, setLogs] = useState<ScanResultLog[]>([]);
  const [resolution, setResolution] = useState("CONFIRMED_NORMAL");
  const [resolutionNote, setResolutionNote] = useState("");
  const [exceptionSubmitting, setExceptionSubmitting] = useState(false);
  const [resolvedBoxId, setResolvedBoxId] = useState<string | null>(null);
  const [showResolveChoices, setShowResolveChoices] = useState(false);
  const [secondaryPanel, setSecondaryPanel] = useState<"current" | "logs">("current");

  function formatLogTime(value: string) {
    return formatWarehouseDate(locale, value, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  }

  function getLogText(log: ScanResultLog) {
    return translateWarehouseMessageText(locale, log.rawText || log.text, log.text);
  }

  useEffect(() => {
    inputRef.current?.focus();
  }, [currentBox, continuousMode, bigFontMode, fullscreenMode]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedLogs = window.localStorage.getItem(STORAGE_LOGS_KEY);
    const storedSound = window.localStorage.getItem(STORAGE_SOUND_KEY);
    const storedFont = window.localStorage.getItem(STORAGE_FONT_KEY);

    if (storedLogs) {
      const parsedLogs = JSON.parse(storedLogs) as ScanResultLog[];
      setLogs(
        parsedLogs.map((log) => ({
          ...log,
          text: translateWarehouseMessageText(locale, log.rawText || log.text, log.text)
        }))
      );
    }
    if (storedSound) {
      setSoundEnabled(storedSound === "1");
    }
    if (storedFont) {
      setBigFontMode(storedFont === "1");
    }
  }, [locale]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedContext = window.localStorage.getItem(STORAGE_CONTEXT_KEY);
    if (storedContext) {
      const parsed = JSON.parse(storedContext) as { boxId: string };
      void fetch("/api/warehouse/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "context", boxId: parsed.boxId })
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.context) {
            setCurrentBox(data.context);
            setFixedBox(data.context);
          } else {
            window.localStorage.removeItem(STORAGE_CONTEXT_KEY);
          }
        })
        .catch(() => {
          window.localStorage.removeItem(STORAGE_CONTEXT_KEY);
        });
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(STORAGE_SOUND_KEY, soundEnabled ? "1" : "0");
  }, [soundEnabled]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(STORAGE_FONT_KEY, bigFontMode ? "1" : "0");
  }, [bigFontMode]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (currentBox) {
      window.localStorage.setItem(STORAGE_CONTEXT_KEY, JSON.stringify({ boxId: currentBox.boxId }));
    } else {
      window.localStorage.removeItem(STORAGE_CONTEXT_KEY);
    }
  }, [currentBox]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const handleFullscreenChange = () => {
      setFullscreenMode(document.fullscreenElement === stationRef.current);
      requestAnimationFrame(() => inputRef.current?.focus());
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    if (!currentBox) {
      setResolution("CONFIRMED_NORMAL");
      setResolutionNote("");
      if (attachmentRef.current) {
        attachmentRef.current.value = "";
      }
    }
  }, [currentBox]);

  useEffect(() => {
    if (currentBox) {
      setFixedBox(currentBox);
    }
  }, [currentBox]);

  const currentMode = useMemo(() => {
    if (!currentBox) {
      return "box";
    }
    return currentBox.billingMode === "PER_ITEM" ? "tracking" : "box";
  }, [currentBox]);

  function clearCurrentBoxForNext() {
    setCurrentBox(null);
    setFixedBox(null);
    setResolvedBoxId(null);
    setShowResolveChoices(false);
    setInputValue("");
    if (attachmentRef.current) {
      attachmentRef.current.value = "";
    }
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function buildFixedStatus(box: ScanContext | null) {
    if (!box) {
      return t3("未开始", "Not started", "Sin iniciar");
    }

    if (resolvedBoxId === box.boxId) {
      return t3("已处理异常", "Resolved", "Resuelto");
    }

    if (box.anomalyType === "SHORTAGE") {
      return t3("少件异常", "Shortage", "Faltante");
    }
    if (box.anomalyType === "OVERAGE") {
      return t3("多件异常", "Overage", "Exceso");
    }
    if (box.anomalyType === "DUPLICATE") {
      return t3("重复件", "Duplicate", "Duplicado");
    }

    if (latestLog?.level === "balance" && currentBox?.boxId === box.boxId) {
      return t3("客户账户受限", "Balance limited", "Saldo limitado");
    }
    if (latestLog?.level === "duplicate" && currentBox?.boxId === box.boxId) {
      return t3("重复件", "Duplicate", "Duplicado");
    }

    if (box.billingMode === "PER_ITEM") {
      if (box.status === "VERIFIED") {
        return t3("正常完成", "Completed", "Completado");
      }
      if (box.validCount > 0) {
        return t3("扫件中", "Scanning items", "Escaneando piezas");
      }
      return t3("扫箱完成", "Box scanned", "Caja escaneada");
    }

    if (box.status === "LABEL_SCANNED") {
      return t3("正常完成", "Completed", "Completado");
    }

    return t3("扫箱完成", "Box scanned", "Caja escaneada");
  }

  function buildLatestConclusion(box: ScanContext | null) {
    if (!box) {
      return "-";
    }

    if (resolvedBoxId === box.boxId) {
      const resolutionLabel =
        box.exceptionResolution === "CONFIRMED_NORMAL"
          ? t3("已确认正常", "Confirmed normal", "Confirmado normal")
          : box.exceptionResolution === "CUSTOMER_RESPONSIBLE"
            ? t3("客户责任", "Customer responsibility", "Responsabilidad del cliente")
            : box.exceptionResolution === "WAREHOUSE_RESPONSIBLE"
            ? t3("仓库责任", "Warehouse responsibility", "Responsabilidad del almacen")
              : t3("已处理", "Resolved", "Resuelto");
      return box.exceptionResolutionNote
        ? `${resolutionLabel} / ${translateWarehouseMessageText(
            locale,
            box.exceptionResolutionNote,
            box.exceptionResolutionNote
          )}`
        : resolutionLabel;
    }

    return latestLog?.text || translateWarehouseMessageText(locale, box.anomalyNote || box.status, box.status);
  }

  async function performScan(value: string) {
    if (!value.trim()) {
      return;
    }

    setSubmitting(true);
    try {
      if (!currentBox) {
        const response = await fetch("/api/warehouse/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "box",
            boxNo: value.trim()
          })
        });
        const data = await response.json();
        if (!response.ok) {
          pushRecentLog(
            setLogs,
            translateWarehouseMessageText(locale, data.error || "箱号不存在", "箱号不存在"),
            getLevelFromMessage(data.error || "", true),
            soundEnabled,
            data.error || "箱号不存在"
          );
          return;
        }

        if (data.context) {
          setFixedBox(data.context);
          setResolvedBoxId(null);
          setShowResolveChoices(false);
        }
        if (data.context?.billingMode === "PER_ITEM") {
          setCurrentBox(data.context);
        } else {
          setCurrentBox(null);
        }
        pushRecentLog(
          setLogs,
          translateWarehouseMessageText(locale, data.message || "扫箱成功", "扫箱成功"),
          getLevelFromMessage(data.message || ""),
          soundEnabled,
          data.message || "扫箱成功"
        );
        return;
      }

      const response = await fetch("/api/warehouse/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "tracking",
          boxNo: currentBox.boxNo,
          trackingNo: value.trim()
        })
      });
      const data = await response.json();
      if (!response.ok) {
        if (data.context) {
          setCurrentBox(data.context);
          setFixedBox(data.context);
        }
        setResolvedBoxId(null);
        pushRecentLog(
          setLogs,
          translateWarehouseMessageText(locale, data.error || "扫描失败", "扫描失败"),
          getLevelFromMessage(data.error || "", true),
          soundEnabled,
          data.error || "扫描失败"
        );
        return;
      }

      if (data.context) {
        setCurrentBox(data.context);
        setFixedBox(data.context);
      }
      setResolvedBoxId(null);
      setShowResolveChoices(false);
      pushRecentLog(
        setLogs,
        translateWarehouseMessageText(locale, data.message || "扫追踪号成功", "扫追踪号成功"),
        getLevelFromMessage(data.message || ""),
        soundEnabled,
        data.message || "扫追踪号成功"
      );
    } finally {
      setInputValue("");
      setSubmitting(false);
      if (continuousMode) {
        requestAnimationFrame(() => inputRef.current?.focus());
      }
    }
  }

  async function finalizeCurrentBox() {
    if (!currentBox) {
      return;
    }

    const response = await fetch(`/api/warehouse/boxes/${currentBox.boxId}/finalize`, {
      method: "POST"
    });
    const data = await response.json();
    if (response.ok) {
      if (data.context) {
        setFixedBox(data.context);
        setResolvedBoxId(null);
      }
      pushRecentLog(
        setLogs,
        translateWarehouseMessageText(locale, data.message || "当前箱已结束", "当前箱已结束"),
        getLevelFromMessage(data.message || data.context?.anomalyNote || ""),
        soundEnabled,
        data.message || "当前箱已结束"
      );
    } else {
      pushRecentLog(
        setLogs,
        translateWarehouseMessageText(locale, data.error || "结束当前箱失败", "结束当前箱失败"),
        getLevelFromMessage(data.error || "", true),
        soundEnabled,
        data.error || "结束当前箱失败"
      );
    }
    if (response.ok && data.context?.status === "EXCEPTION") {
      setCurrentBox(data.context);
    } else {
      setCurrentBox(null);
    }
    setInputValue("");
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function resetCurrentBox() {
    clearCurrentBoxForNext();
    pushRecentLog(
      setLogs,
      t3("已重新选择箱", "Box selection reset", "Caja restablecida"),
      "success",
      soundEnabled,
      "已重新选择箱"
    );
  }

  async function toggleFullscreenMode() {
    if (typeof document === "undefined") {
      return;
    }

    if (document.fullscreenElement === stationRef.current) {
      await document.exitFullscreen();
      return;
    }

    await stationRef.current?.requestFullscreen();
  }

  async function submitExceptionResolution() {
    if (!currentBox) {
      return;
    }

    const formData = new FormData();
    formData.set("forecastBoxId", currentBox.boxId);
    formData.set("resolution", resolution);
    formData.set("note", resolutionNote);

    const files = attachmentRef.current?.files;
    if (files) {
      Array.from(files).forEach((file) => {
        formData.append("attachments", file);
      });
    }

    setExceptionSubmitting(true);
    try {
      const response = await fetch("/api/warehouse/exceptions", {
        method: "POST",
        body: formData
      });
      const data = await response.json();
      if (!response.ok) {
        pushRecentLog(
          setLogs,
          translateWarehouseMessageText(locale, data.error || "异常处理失败", "异常处理失败"),
          getLevelFromMessage(data.error || "", true),
          soundEnabled,
          data.error || "异常处理失败"
        );
        return;
      }

      if (data.context) {
        setCurrentBox(data.context);
        setFixedBox(data.context);
      }
      setResolvedBoxId(currentBox.boxId);
      setShowResolveChoices(true);
      setResolutionNote("");
      if (attachmentRef.current) {
        attachmentRef.current.value = "";
      }
      pushRecentLog(
        setLogs,
        translateWarehouseMessageText(locale, data.message || "异常已处理", "异常已处理"),
        "success",
        soundEnabled,
        data.message || "异常已处理"
      );
    } finally {
      setExceptionSubmitting(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }

  function openReprint(layout: "single" | "thermal_100x150") {
    if (!currentBox || typeof window === "undefined") {
      return;
    }
    const url = `/api/boxes/${currentBox.boxId}/label?layout=${layout}&reprint=1`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  const latestLog = logs[0] ?? null;
  const t3 = (zh: string, en: string, es: string) => pickWarehouseText(locale, zh, en, es);
  const fixedStatus = buildFixedStatus(fixedBox);
  const latestConclusion = buildLatestConclusion(fixedBox);
  const activeHistory = currentBox?.recentTrackingScans ?? fixedBox?.recentTrackingScans ?? [];
  const successLogCount = logs.filter((log) => log.level === "success").length;
  const flaggedLogCount = logs.filter((log) => log.level === "duplicate" || log.level === "warning").length;
  const errorLogCount = logs.filter((log) => log.level === "balance" || log.level === "error").length;
  const stationModeLabel =
    currentMode === "box"
      ? t3("等待扫描箱唛", "Scan boxNo", "Escanear boxNo")
      : t3("等待扫描追踪号", "Scan trackingNo", "Escanear trackingNo");
  const latestStatusClass =
    latestLog?.level === "success"
      ? "scan-status success"
      : latestLog?.level === "duplicate"
        ? "scan-status duplicate"
        : latestLog?.level === "warning"
          ? "scan-status warning"
          : latestLog?.level === "balance"
            ? "scan-status balance"
            : latestLog?.level === "error"
              ? "scan-status error"
              : "scan-status";

  const sidePanelVisible = Boolean(
    currentBox &&
      (
        currentBox.anomalyType !== "NORMAL" ||
        latestLog?.level === "duplicate" ||
        latestLog?.level === "warning" ||
        latestLog?.level === "balance" ||
        latestLog?.level === "error"
      )
  );

  const sidePanelIssue =
    currentBox?.anomalyType && currentBox.anomalyType !== "NORMAL"
      ? currentBox.anomalyType === "SHORTAGE"
        ? t3("少件", "Shortage", "Faltante")
        : currentBox.anomalyType === "OVERAGE"
          ? t3("多件", "Overage", "Exceso")
          : currentBox.anomalyType === "DUPLICATE"
            ? t3("重复件", "Duplicate", "Duplicado")
            : currentBox.anomalyType
      : latestLog?.level === "duplicate"
        ? t3("重复件", "Duplicate", "Duplicado")
        : latestLog?.level === "warning"
          ? t3("数量异常", "Count issue", "Cantidad anormal")
          : latestLog?.level === "balance"
            ? t3("客户账户受限", "Balance limited", "Saldo limitado")
            : latestLog?.level === "error"
              ? t3("扫描异常", "Scan error", "Error de escaneo")
              : "NORMAL";

  return (
    <div ref={stationRef} className={fullscreenMode ? "scan-station fullscreen" : "scan-station"}>
      <div className="card soft stacked" style={{ marginBottom: "1rem" }}>
        <div className="section-head">
          <div>
                <h3>{t3("固定结果栏", "Result bar", "Barra fija")}</h3>
                <p className="muted">{t3("最近一箱的结果固定保留在这里。", "Latest box result stays here.", "El ultimo resultado queda aqui.")}</p>
              </div>
              <div className="checkbox-grid">
                <span className="pill">{fixedStatus}</span>
                <button type="button" className="secondary" onClick={clearCurrentBoxForNext}>
                  {t3("清空当前箱，进入下一箱", "Clear and next box", "Limpiar y siguiente")}
                </button>
              </div>
            </div>
            <div className="scan-summary-grid">
              <div className="scan-summary-item">
            <span>{t3("当前箱号", "Current box", "Caja actual")}</span>
            <strong>{fixedBox?.boxNo || "-"}</strong>
          </div>
          <div className="scan-summary-item">
            <span>{t3("客户", "Client", "Cliente")}</span>
            <strong>{fixedBox?.customerName || "-"}</strong>
          </div>
          <div className="scan-summary-item">
            <span>{t3("预报件数", "Expected", "Esperado")}</span>
            <strong>{fixedBox?.expectedOrderCount ?? 0}</strong>
          </div>
          <div className="scan-summary-item">
            <span>{t3("有效件数", "Valid scans", "Escaneos validos")}</span>
            <strong>{fixedBox?.validCount ?? 0}</strong>
          </div>
          <div className="scan-summary-item">
            <span>{t3("重复件数", "Duplicates", "Duplicados")}</span>
            <strong>{fixedBox?.duplicateCount ?? 0}</strong>
          </div>
          <div className="scan-summary-item">
            <span>{t3("扫描流程", "Flow", "Flujo")}</span>
            <strong>
              {fixedBox?.billingMode === "PER_ITEM"
                ? t3("继续扫件", "Continue items", "Seguir items")
                : fixedBox
                  ? t3("扫箱完成", "Box scanned", "Caja escaneada")
                  : "-"}
            </strong>
          </div>
          <div className="scan-summary-item scan-summary-wide">
            <span>{t3("最新处理结论", "Latest resolution", "Ultima resolucion")}</span>
            <strong>{latestConclusion}</strong>
          </div>
        </div>
        {showResolveChoices ? (
          <div className="scan-next-box-actions">
            <strong>{t3("异常处理已提交，下一步怎么做？", "Resolution saved, next step?", "Resolucion guardada, que sigue?")}</strong>
            <div className="checkbox-grid">
              <button type="button" className="secondary" onClick={() => setShowResolveChoices(false)}>
                {t3("继续处理当前箱", "Stay on this box", "Seguir en esta caja")}
              </button>
              <button type="button" onClick={clearCurrentBoxForNext}>
                {t3("清空并扫描下一箱", "Clear and scan next", "Limpiar y siguiente")}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="scan-station-grid simplified">
        <div className="scan-station-main-column">
          <div className="card soft stacked">
            <div className="section-head">
              <div>
                <h3>{t3("扫码主控台", "Scan console", "Consola de escaneo")}</h3>
                <p className="muted">{t3("第一屏只保留扫码输入、当前箱状态和快捷动作。", "Only scan input, box state and quick actions.", "Solo entrada, estado y acciones rapidas.")}</p>
              </div>
              <div className="checkbox-grid">
                <label>
                  <input
                    type="checkbox"
                    checked={continuousMode}
                    onChange={(event) => setContinuousMode(event.target.checked)}
                  />
                  {t3("连续扫描", "Continuous", "Continuo")}
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={soundEnabled}
                    onChange={(event) => setSoundEnabled(event.target.checked)}
                  />
                  {t3("声音", "Sound", "Sonido")}
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={bigFontMode}
                    onChange={(event) => setBigFontMode(event.target.checked)}
                  />
                  {t3("大字体", "Large text", "Texto grande")}
                </label>
                <button type="button" className="secondary" onClick={() => void toggleFullscreenMode()}>
                  {fullscreenMode ? t3("退出全屏", "Exit fullscreen", "Salir pantalla completa") : t3("全屏模式", "Fullscreen", "Pantalla completa")}
                </button>
              </div>
            </div>

            <div className="scan-summary-grid scan-summary-grid-compact">
              <div className="scan-summary-item">
                <span>{t3("当前模式", "Mode", "Modo")}</span>
                <strong>{stationModeLabel}</strong>
              </div>
              <div className="scan-summary-item">
                <span>{t3("工作状态", "State", "Estado")}</span>
                <strong>{continuousMode ? t3("连续扫描中", "Continuous", "Continuo") : t3("单次扫描", "Single scan", "Escaneo unico")}</strong>
              </div>
              <div className="scan-summary-item">
                <span>{t3("声音提示", "Sound cue", "Aviso sonoro")}</span>
                <strong>{soundEnabled ? t3("开启", "On", "Activo") : t3("关闭", "Off", "Apagado")}</strong>
              </div>
              <div className="scan-summary-item">
                <span>{t3("显示模式", "Display", "Vista")}</span>
                <strong>{bigFontMode ? t3("大字体", "Large text", "Texto grande") : t3("标准字体", "Standard", "Estandar")}</strong>
              </div>
            </div>

            <div className={latestStatusClass}>
              <div className="scan-status-label">{t3("最新扫描结果", "Latest result", "Ultimo resultado")}</div>
              <strong>{latestLog ? getLogText(latestLog) : t3("等待扫描", "Waiting", "En espera")}</strong>
              <div className="muted">
                {latestLog
                  ? `${t3("时间", "Time", "Hora")} ${formatLogTime(latestLog.createdAt)}`
                  : t3("尚未产生扫描结果", "No scan result yet", "Sin resultado aun")}
              </div>
            </div>

            <input
              ref={inputRef}
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void performScan(inputValue);
                }
              }}
              placeholder={currentMode === "box" ? t3("扫描箱唛 boxNo", "Scan boxNo", "Escanear boxNo") : t3("扫描追踪号 trackingNo", "Scan trackingNo", "Escanear trackingNo")}
              style={bigFontMode ? { fontSize: "1.4rem", padding: "1rem 1.1rem" } : undefined}
            />
            <button type="button" onClick={() => void performScan(inputValue)} disabled={submitting}>
              {currentMode === "box" ? t3("提交箱唛", "Submit box", "Enviar caja") : t3("提交追踪号", "Submit tracking", "Enviar guia")}
            </button>

            {currentBox ? (
              <div className="stacked" style={bigFontMode ? { fontSize: "1.2rem" } : undefined}>
                <div className="scan-focus-box">{currentBox.boxNo}</div>
                <div className="scan-summary-grid">
                  <div className="scan-summary-item">
                    <span>{t3("客户名称", "Client", "Cliente")}</span>
                    <strong>{currentBox.customerName}</strong>
                  </div>
                <div className="scan-summary-item">
                    <span>{t3("扫描流程", "Flow", "Flujo")}</span>
                    <strong>{currentBox.billingMode === "PER_ITEM" ? t3("先扫箱，再扫件", "Box then items", "Caja y luego items") : t3("扫箱后可直接结束", "Finish after box", "Termina tras caja")}</strong>
                  </div>
                  <div className="scan-summary-item">
                    <span>{t3("预报编号", "Forecast No.", "Preaviso")}</span>
                    <strong>{currentBox.forecastNo}</strong>
                  </div>
                  <div className="scan-summary-item">
                    <span>{t3("预报件数", "Expected", "Esperado")}</span>
                    <strong>{currentBox.expectedOrderCount}</strong>
                  </div>
                  <div className="scan-summary-item">
                    <span>{t3("已扫有效件数", "Valid scans", "Validos")}</span>
                    <strong>{currentBox.validCount}</strong>
                  </div>
                  <div className="scan-summary-item">
                    <span>{t3("重复件数", "Duplicates", "Duplicados")}</span>
                    <strong>{currentBox.duplicateCount}</strong>
                  </div>
                  <div className="scan-summary-item scan-summary-wide">
                    <span>{t3("异常状态", "Exception", "Excepcion")}</span>
                    <strong>
                      {currentBox.anomalyType === "SHORTAGE"
                        ? t3("少件", "Shortage", "Faltante")
                        : currentBox.anomalyType === "OVERAGE"
                          ? t3("多件", "Overage", "Exceso")
                          : currentBox.anomalyType === "DUPLICATE"
                            ? t3("重复件", "Duplicate", "Duplicado")
                            : currentBox.anomalyType === "NORMAL"
                              ? t3("正常", "Normal", "Normal")
                              : currentBox.anomalyType}
                      {currentBox.anomalyNote ? ` · ${translateWarehouseMessageText(locale, currentBox.anomalyNote, currentBox.anomalyNote)}` : ""}
                    </strong>
                  </div>
                </div>
                <div className="toolbar warehouse-primary-actions">
                  <button type="button" className="secondary" onClick={() => void finalizeCurrentBox()}>
                    {t3("结束当前箱", "Finish box", "Finalizar caja")}
                  </button>
                  <button type="button" className="secondary" onClick={resetCurrentBox}>
                    {t3("重新选择箱", "Reselect box", "Elegir caja")}
                  </button>
                  <button type="button" className="secondary" onClick={() => openReprint("single")}>
                    {t3("复打 A4 单张", "Reprint A4", "Reimprimir A4")}
                  </button>
                  <button type="button" className="secondary" onClick={() => openReprint("thermal_100x150")}>
                    {t3("复打热敏纸", "Reprint thermal", "Reimprimir termica")}
                  </button>
                </div>
              </div>
            ) : (
              <div className="compact-item">
                <strong>{t3("等待新箱开始", "Waiting for next box", "Esperando siguiente caja")}</strong>
                <span className="muted">{t3("当前未选箱，等待扫描箱唛。", "No active box selected.", "No hay caja activa.")}</span>
              </div>
            )}
          </div>

        </div>

        <div className="scan-station-side-panel">
          <div className="card soft stacked">
            <div className="section-head">
              <div>
                <h3>{t3("异常处理侧栏", "Exception panel", "Panel de excepciones")}</h3>
                <p className="muted">{t3("只在异常时介入。", "Appears only when needed.", "Solo aparece con incidencias.")}</p>
              </div>
              <span className={sidePanelVisible ? "pill" : "muted"}>
                {sidePanelVisible ? t3("已触发", "Triggered", "Activado") : t3("未触发", "Idle", "Inactivo")}
              </span>
            </div>

            {sidePanelVisible && currentBox ? (
              <>
                <div className="scan-exception-banner">
                  <strong>{sidePanelIssue}</strong>
                  <div className="muted">
                    {currentBox.anomalyNote
                      ? translateWarehouseMessageText(locale, currentBox.anomalyNote, currentBox.anomalyNote)
                      : latestLog
                        ? getLogText(latestLog)
                        : t3("当前箱存在待处理异常", "There is an active exception on this box", "Esta caja tiene una excepcion activa")}
                  </div>
                </div>
                <div className="scan-summary-grid">
                  <div className="scan-summary-item">
                    <span>{t3("客户", "Client", "Cliente")}</span>
                    <strong>{currentBox.customerName}</strong>
                  </div>
                  <div className="scan-summary-item">
                    <span>{t3("预报编号", "Forecast", "Preaviso")}</span>
                    <strong>{currentBox.forecastNo}</strong>
                  </div>
                  <div className="scan-summary-item">
                    <span>{t3("箱号", "Box", "Caja")}</span>
                    <strong>{currentBox.boxNo}</strong>
                  </div>
                  <div className="scan-summary-item">
                    <span>{t3("预报件数", "Expected", "Esperado")}</span>
                    <strong>{currentBox.expectedOrderCount}</strong>
                  </div>
                  <div className="scan-summary-item">
                    <span>{t3("有效件数", "Valid scans", "Validos")}</span>
                    <strong>{currentBox.validCount}</strong>
                  </div>
                  <div className="scan-summary-item">
                    <span>{t3("重复件数", "Duplicates", "Duplicados")}</span>
                    <strong>{currentBox.duplicateCount}</strong>
                  </div>
                </div>

                <select value={resolution} onChange={(event) => setResolution(event.target.value)}>
                  <option value="CONFIRMED_NORMAL">{t3("已确认正常", "Confirmed normal", "Confirmado normal")}</option>
                  <option value="CUSTOMER_RESPONSIBLE">{t3("客户责任", "Customer side", "Cliente")}</option>
                  <option value="WAREHOUSE_RESPONSIBLE">{t3("仓库责任", "Warehouse side", "Almacen")}</option>
                </select>
                <textarea
                  value={resolutionNote}
                  onChange={(event) => setResolutionNote(event.target.value)}
                  placeholder={t3("处理备注", "Resolution note", "Nota")}
                />
                <input
                  ref={attachmentRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                  multiple
                />
                <button type="button" onClick={() => void submitExceptionResolution()} disabled={exceptionSubmitting}>
                  {exceptionSubmitting ? t3("处理中...", "Submitting...", "Enviando...") : t3("提交异常处理", "Submit resolution", "Enviar resolucion")}
                </button>

                <div className="compact-list">
                  {currentBox.recentTrackingScans.map((item) => (
                    <div key={item.id} className="compact-item">
                      <strong>{item.trackingNo}</strong>
                      <span className={item.isDuplicate ? "danger" : "muted"}>
                        {item.isDuplicate ? t3("重复件，已记录", "Duplicate logged", "Duplicado registrado") : t3("有效件", "Valid item", "Valido")}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="compact-item">
                <strong>{t3("等待异常触发", "Waiting for issue", "Esperando incidencia")}</strong>
                <span className="muted">{t3("异常出现时，这里会自动切换成处理面板。", "Panel opens automatically on issue.", "El panel se abre automaticamente.")}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="scan-secondary-zone">
        <div className="card soft stacked">
          <div className="section-head">
            <div>
              <h3>{t3("辅助回看区", "Review area", "Zona de revision")}</h3>
              <p className="muted">{t3("历史和结果下沉到第二层，避免影响第一屏扫码。", "History and results stay in the second layer.", "El historial y resultados quedan en la segunda capa.")}</p>
            </div>
            <div className="segmented-switch">
              <button
                type="button"
                className={secondaryPanel === "current" ? "secondary active" : "secondary"}
                onClick={() => setSecondaryPanel("current")}
              >
                {t3("当前箱内历史", "Current box history", "Historial actual")}
              </button>
              <button
                type="button"
                className={secondaryPanel === "logs" ? "secondary active" : "secondary"}
                onClick={() => setSecondaryPanel("logs")}
              >
                {t3("最近 20 条结果", "Latest 20 results", "Ultimos 20 resultados")}
              </button>
            </div>
          </div>

          {secondaryPanel === "current" ? (
            <>
              <div className="section-head">
                <div>
                  <h4>{t3("当前箱内历史", "Current box history", "Historial de la caja actual")}</h4>
                  <p className="muted">{t3("只看当前箱最近扫描明细，方便现场核对。", "Review only the current box scan details.", "Revisa solo el detalle de la caja actual.")}</p>
                </div>
                <span className="muted">{activeHistory.length} {t3("条", "records", "registros")}</span>
              </div>
              {activeHistory.length > 0 ? (
                <div className="compact-list">
                  {activeHistory.map((item) => (
                    <div key={item.id} className="compact-item">
                      <strong>{item.trackingNo}</strong>
                      <span className={item.isDuplicate ? "danger" : "muted"}>
                        {item.isDuplicate ? t3("重复件，已记录", "Duplicate logged", "Duplicado registrado") : t3("有效件", "Valid item", "Valido")}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="muted">{t3("当前还没有可展示的箱内扫描明细。", "No current box details yet.", "Aun no hay detalles de la caja actual.")}</div>
              )}
            </>
          ) : (
            <>
              <div className="scan-summary-grid">
              <div className="scan-summary-item">
                <span>{t3("成功", "Success", "Exitos")}</span>
                <strong>{successLogCount}</strong>
              </div>
              <div className="scan-summary-item">
                <span>{t3("提醒 / 重复", "Warnings / duplicates", "Alertas / duplicados")}</span>
                <strong>{flaggedLogCount}</strong>
              </div>
              <div className="scan-summary-item">
                <span>{t3("异常 / 余额", "Errors / balance", "Errores / saldo")}</span>
                <strong>{errorLogCount}</strong>
              </div>
              </div>
              {logs.length === 0 ? <div className="muted">{t3("暂无扫描记录", "No scan logs yet", "Aun no hay registros")}</div> : null}
              <div className="compact-list">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="compact-item"
                    style={{
                      fontSize: bigFontMode ? "1.2rem" : undefined,
                      borderColor:
                        log.level === "success"
                          ? "rgba(31, 122, 77, 0.22)"
                          : log.level === "duplicate" || log.level === "warning"
                            ? "rgba(145, 95, 45, 0.22)"
                            : "rgba(178, 58, 43, 0.22)",
                      background:
                        log.level === "success"
                          ? "rgba(31, 122, 77, 0.08)"
                          : log.level === "duplicate" || log.level === "warning"
                            ? "rgba(145, 95, 45, 0.08)"
                            : "rgba(178, 58, 43, 0.08)"
                    }}
                  >
                    <strong>[{formatLogTime(log.createdAt)}]</strong>
                    <span>{getLogText(log)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
