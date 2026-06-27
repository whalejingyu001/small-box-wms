import { access, readFile } from "node:fs/promises";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, StandardFonts, type PDFFont } from "pdf-lib";

const FONT_CANDIDATES = [
  "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
  "/System/Library/Fonts/Hiragino Sans GB.ttc",
  "/System/Library/Fonts/Supplemental/Songti.ttc"
];

let cachedFontBytes: Buffer | null = null;

async function loadFontBytes() {
  if (cachedFontBytes) {
    return cachedFontBytes;
  }

  for (const candidate of FONT_CANDIDATES) {
    try {
      await access(candidate);
      cachedFontBytes = await readFile(candidate);
      return cachedFontBytes;
    } catch {
      continue;
    }
  }

  return null;
}

export async function loadPdfFonts(pdf: PDFDocument): Promise<{
  regular: PDFFont;
  bold: PDFFont;
  usingCustomFont: boolean;
}> {
  const fontBytes = await loadFontBytes();

  if (fontBytes) {
    pdf.registerFontkit(fontkit);
    const customFont = await pdf.embedFont(fontBytes, { subset: true });
    return {
      regular: customFont,
      bold: customFont,
      usingCustomFont: true
    };
  }

  return {
    regular: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
    usingCustomFont: false
  };
}
