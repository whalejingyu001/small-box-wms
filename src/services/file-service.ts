import crypto from "node:crypto";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { FileAssetCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  ALLOWED_UPLOAD_EXTENSIONS,
  ALLOWED_UPLOAD_MIME_TYPES,
  MAX_UPLOAD_SIZE_BYTES
} from "@/lib/upload-config";
import { logAudit } from "@/services/audit-service";

const UPLOAD_ROOT = path.join(process.cwd(), "uploads");

function safeBaseName(filename: string) {
  return filename
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "file";
}

function getDirectoryForCategory(category: FileAssetCategory) {
  switch (category) {
    case FileAssetCategory.RECHARGE_PROOF:
      return "recharge";
    case FileAssetCategory.EXPENSE_VOUCHER:
      return "expenses";
    case FileAssetCategory.BOX_EXCEPTION_EVIDENCE:
      return "box-exceptions";
    case FileAssetCategory.FINANCE_ARCHIVE:
      return "finance-archives";
    default:
      return "misc";
  }
}

function validateUpload(file: File) {
  const extension = path.extname(file.name).toLowerCase();
  if (!ALLOWED_UPLOAD_MIME_TYPES.has(file.type) || !ALLOWED_UPLOAD_EXTENSIONS.has(extension)) {
    throw new Error("附件格式仅支持 jpg、jpeg、png、pdf");
  }

  if (file.size <= 0) {
    throw new Error("附件不能为空");
  }

  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    throw new Error("附件大小不能超过 10MB");
  }
}

export async function saveUploadedFile(input: {
  file: File;
  category: FileAssetCategory;
  uploadedByUserId?: string | null;
  customerId?: string | null;
}) {
  validateUpload(input.file);

  const extension = path.extname(input.file.name).toLowerCase();
  const directory = getDirectoryForCategory(input.category);
  const safeName = safeBaseName(path.basename(input.file.name, extension));
  const storageFilename = `${new Date().toISOString().slice(0, 10)}-${crypto.randomUUID()}-${safeName}${extension}`;
  const absoluteDir = path.join(UPLOAD_ROOT, directory);
  const absolutePath = path.join(absoluteDir, storageFilename);
  const storagePath = `/uploads/${directory}/${storageFilename}`;

  await mkdir(absoluteDir, { recursive: true });
  const bytes = Buffer.from(await input.file.arrayBuffer());
  await writeFile(absolutePath, bytes);

  const asset = await prisma.fileAsset.create({
    data: {
      category: input.category,
      storagePath,
      storageFilename,
      originalFilename: input.file.name,
      mimeType: input.file.type,
      sizeBytes: input.file.size,
      uploadedByUserId: input.uploadedByUserId ?? null
    }
  });

  await logAudit({
    action: "file.upload",
    entityType: "FileAsset",
    entityId: asset.id,
    detail: `${input.category} ${input.file.name}`,
    customerId: input.customerId ?? null,
    userId: input.uploadedByUserId ?? null
  });

  return asset;
}

export async function saveGeneratedFile(input: {
  filename: string;
  mimeType: string;
  bytes: Buffer;
  category: FileAssetCategory;
  uploadedByUserId?: string | null;
  customerId?: string | null;
}) {
  const extension = path.extname(input.filename).toLowerCase();
  const directory = getDirectoryForCategory(input.category);
  const safeName = safeBaseName(path.basename(input.filename, extension));
  const storageFilename = `${new Date().toISOString().slice(0, 10)}-${crypto.randomUUID()}-${safeName}${extension}`;
  const absoluteDir = path.join(UPLOAD_ROOT, directory);
  const absolutePath = path.join(absoluteDir, storageFilename);
  const storagePath = `/uploads/${directory}/${storageFilename}`;

  await mkdir(absoluteDir, { recursive: true });
  await writeFile(absolutePath, input.bytes);

  const asset = await prisma.fileAsset.create({
    data: {
      category: input.category,
      storagePath,
      storageFilename,
      originalFilename: input.filename,
      mimeType: input.mimeType,
      sizeBytes: input.bytes.length,
      uploadedByUserId: input.uploadedByUserId ?? null
    }
  });

  await logAudit({
    action: "file.generate",
    entityType: "FileAsset",
    entityId: asset.id,
    detail: `${input.category} ${input.filename}`,
    customerId: input.customerId ?? null,
    userId: input.uploadedByUserId ?? null
  });

  return asset;
}
