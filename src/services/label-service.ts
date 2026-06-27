import { PDFDocument, rgb, type PDFPage } from "pdf-lib";
import QRCode from "qrcode";
import bwipjs from "bwip-js";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/services/audit-service";
import { loadPdfFonts } from "@/services/pdf-font-service";

const MM_TO_PT = 72 / 25.4;
const A4_WIDTH = 210 * MM_TO_PT;
const A4_HEIGHT = 297 * MM_TO_PT;
const THERMAL_100_150 = {
  width: 100 * MM_TO_PT,
  height: 150 * MM_TO_PT
};

type LoadedForecast = Awaited<ReturnType<typeof loadForecastForLabels>>;

async function loadForecastForLabels(forecastId: string) {
  return prisma.forecast.findUnique({
    where: { id: forecastId },
    include: {
      customer: true,
      boxes: {
        include: {
          channels: {
            include: {
              channel: true
            }
          }
        },
        orderBy: { boxIndex: "asc" }
      }
    }
  });
}

async function createBarcodePng(text: string, scale: number, height: number) {
  return bwipjs.toBuffer({
    bcid: "code128",
    text,
    scale,
    height,
    includetext: true,
    textxalign: "center",
    backgroundcolor: "FFFFFF"
  });
}

async function drawStandardLabelBlock(input: {
  pdf: PDFDocument;
  page: PDFPage;
  forecast: NonNullable<LoadedForecast>;
  box: NonNullable<LoadedForecast>["boxes"][number];
  x: number;
  y: number;
  width: number;
  height: number;
}) {
  const { pdf, page, forecast, box, x, y, width, height } = input;
  const { regular: font, bold } = await loadPdfFonts(pdf);
  const barcode = await pdf.embedPng(await createBarcodePng(box.boxNo, 3, 12));
  const qrPng = await QRCode.toDataURL(box.boxNo, { margin: 1, width: 180 });
  const qr = await pdf.embedPng(Buffer.from(qrPng.split(",")[1], "base64"));

  page.drawRectangle({
    x,
    y,
    width,
    height,
    borderWidth: 1,
    borderColor: rgb(0.25, 0.18, 0.12)
  });

  const top = y + height - 16;
  page.drawText(forecast.customer.companyName, {
    x: x + 14,
    y: top,
    size: 12,
    font: bold
  });
  page.drawText(`Forecast: ${forecast.forecastNo}`, { x: x + 14, y: top - 20, size: 10, font });
  page.drawText(`Box No: ${box.boxNo}`, { x: x + 14, y: top - 36, size: 10, font: bold });
  page.drawText(`Channels: ${box.channels.map((item) => item.channel.code).join(" / ")}`, {
    x: x + 14,
    y: top - 52,
    size: 10,
    font
  });
  page.drawText(`Orders: ${box.expectedOrderCount}`, { x: x + 14, y: top - 68, size: 10, font });
  page.drawText(`Box Spec: ${box.boxSpec}`, { x: x + 14, y: top - 84, size: 10, font });
  page.drawText(`Created: ${new Date(forecast.createdAt).toLocaleString("zh-CN")}`, {
    x: x + 14,
    y: top - 100,
    size: 9,
    font
  });

  page.drawImage(barcode, {
    x: x + 14,
    y: y + 24,
    width: width - 120,
    height: 48
  });
  page.drawImage(qr, {
    x: x + width - 88,
    y: y + 18,
    width: 70,
    height: 70
  });
}

async function drawThermalLabelBlock(input: {
  pdf: PDFDocument;
  page: PDFPage;
  forecast: NonNullable<LoadedForecast>;
  box: NonNullable<LoadedForecast>["boxes"][number];
}) {
  const { pdf, page, forecast, box } = input;
  const { regular: font, bold } = await loadPdfFonts(pdf);
  const barcode = await pdf.embedPng(await createBarcodePng(box.boxNo, 4, 20));
  const qrPng = await QRCode.toDataURL(box.boxNo, { margin: 1, width: 200 });
  const qr = await pdf.embedPng(Buffer.from(qrPng.split(",")[1], "base64"));

  const width = THERMAL_100_150.width;
  const height = THERMAL_100_150.height;
  page.drawRectangle({
    x: 8,
    y: 8,
    width: width - 16,
    height: height - 16,
    borderWidth: 1.2,
    borderColor: rgb(0.1, 0.1, 0.1)
  });

  page.drawText(forecast.customer.companyName, {
    x: 18,
    y: height - 28,
    size: 14,
    font: bold
  });
  page.drawText(`预报编号 ${forecast.forecastNo}`, {
    x: 18,
    y: height - 48,
    size: 10,
    font
  });

  page.drawText(box.boxNo, {
    x: 18,
    y: height - 76,
    size: 19,
    font: bold
  });

  page.drawText(`渠道 ${box.channels.map((item) => item.channel.code).join(" / ")}`, {
    x: 18,
    y: height - 98,
    size: 10,
    font
  });
  page.drawText(`预报件数 ${box.expectedOrderCount}`, {
    x: 18,
    y: height - 114,
    size: 10,
    font
  });
  page.drawText(`箱规 ${box.boxSpec}`, {
    x: 18,
    y: height - 130,
    size: 10,
    font
  });
  page.drawText(`创建时间 ${new Date(forecast.createdAt).toLocaleString("zh-CN")}`, {
    x: 18,
    y: height - 146,
    size: 9,
    font
  });

  page.drawImage(barcode, {
    x: 16,
    y: 88,
    width: width - 32,
    height: 86
  });
  page.drawImage(qr, {
    x: width - 106,
    y: 18,
    width: 82,
    height: 82
  });
}

export async function buildForecastLabelsPdf(input: {
  forecastId: string;
  boxId?: string | null;
  layout?: "a4" | "single" | "thermal_100x150";
}) {
  const forecast = await loadForecastForLabels(input.forecastId);
  if (!forecast) {
    throw new Error("预报不存在");
  }

  const boxes = input.boxId ? forecast.boxes.filter((item) => item.id === input.boxId) : forecast.boxes;
  if (boxes.length === 0) {
    throw new Error("未找到可打印的箱唛");
  }

  const pdf = await PDFDocument.create();
  const layout = input.layout ?? (input.boxId ? "single" : "a4");

  if (layout === "a4") {
    const cols = 2;
    const rows = 4;
    const margin = 24;
    const gap = 12;
    const labelWidth = (A4_WIDTH - margin * 2 - gap) / cols;
    const labelHeight = (A4_HEIGHT - margin * 2 - gap * (rows - 1)) / rows;

    for (let index = 0; index < boxes.length; index += 1) {
      const slot = index % (cols * rows);
      const page = slot === 0 ? pdf.addPage([A4_WIDTH, A4_HEIGHT]) : pdf.getPages()[pdf.getPageCount() - 1];
      const col = slot % cols;
      const row = Math.floor(slot / cols);
      const x = margin + col * (labelWidth + gap);
      const y = A4_HEIGHT - margin - (row + 1) * labelHeight - row * gap;

      await drawStandardLabelBlock({
        pdf,
        page,
        forecast,
        box: boxes[index],
        x,
        y,
        width: labelWidth,
        height: labelHeight
      });
    }
  } else if (layout === "single") {
    for (const box of boxes) {
      const page = pdf.addPage([400, 260]);
      await drawStandardLabelBlock({
        pdf,
        page,
        forecast,
        box,
        x: 12,
        y: 12,
        width: 376,
        height: 236
      });
    }
  } else {
    for (const box of boxes) {
      const page = pdf.addPage([THERMAL_100_150.width, THERMAL_100_150.height]);
      await drawThermalLabelBlock({
        pdf,
        page,
        forecast,
        box
      });
    }
  }

  const bytes = await pdf.save();
  const filename =
    layout === "thermal_100x150"
      ? input.boxId
        ? `thermal-label-${boxes[0].boxNo}.pdf`
        : `thermal-labels-${forecast.forecastNo}.pdf`
      : input.boxId
        ? `label-${boxes[0].boxNo}.pdf`
        : `labels-${forecast.forecastNo}.pdf`;

  return {
    bytes: Buffer.from(bytes),
    filename,
    forecast
  };
}

export async function logBoxLabelReprint(input: {
  boxId: string;
  layout: "single" | "thermal_100x150";
  operatorId: string;
}) {
  const box = await prisma.forecastBox.findUnique({
    where: { id: input.boxId },
    include: {
      forecast: true
    }
  });

  if (!box) {
    throw new Error("箱子不存在");
  }

  await logAudit({
    action: "box.label.reprint",
    entityType: "ForecastBox",
    entityId: box.id,
    detail: `复打箱唛 ${box.boxNo} / 模板 ${input.layout}`,
    customerId: box.forecast.customerId,
    userId: input.operatorId,
    forecastId: box.forecastId
  });
}
