-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyName" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "remarks" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "customerId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Channel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Forecast" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "forecastNo" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "totalBoxes" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "submittedAt" DATETIME,
    "receivedAt" DATETIME,
    CONSTRAINT "Forecast_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ForecastBox" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "forecastId" TEXT NOT NULL,
    "boxNo" TEXT NOT NULL,
    "boxIndex" INTEGER NOT NULL,
    "boxSpec" TEXT NOT NULL,
    "expectedOrderCount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "scannedAt" DATETIME,
    "completedAt" DATETIME,
    "anomalyType" TEXT NOT NULL DEFAULT 'NORMAL',
    "anomalyNote" TEXT,
    "exceptionResolution" TEXT NOT NULL DEFAULT 'PENDING',
    "exceptionResolvedAt" DATETIME,
    "exceptionResolvedByUserId" TEXT,
    "exceptionResolutionNote" TEXT,
    CONSTRAINT "ForecastBox_forecastId_fkey" FOREIGN KEY ("forecastId") REFERENCES "Forecast" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ForecastBox_exceptionResolvedByUserId_fkey" FOREIGN KEY ("exceptionResolvedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ForecastBoxChannel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "forecastBoxId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    CONSTRAINT "ForecastBoxChannel_forecastBoxId_fkey" FOREIGN KEY ("forecastBoxId") REFERENCES "ForecastBox" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ForecastBoxChannel_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BoxScanRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "forecastBoxId" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "scannedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL DEFAULT 'box_label',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BoxScanRecord_forecastBoxId_fkey" FOREIGN KEY ("forecastBoxId") REFERENCES "ForecastBox" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "BoxScanRecord_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TrackingScanRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "forecastBoxId" TEXT NOT NULL,
    "trackingNo" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "scannedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDuplicate" BOOLEAN NOT NULL DEFAULT false,
    "duplicateOfId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "walletTransactionId" TEXT,
    CONSTRAINT "TrackingScanRecord_forecastBoxId_fkey" FOREIGN KEY ("forecastBoxId") REFERENCES "ForecastBox" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TrackingScanRecord_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TrackingScanRecord_duplicateOfId_fkey" FOREIGN KEY ("duplicateOfId") REFERENCES "TrackingScanRecord" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TrackingScanRecord_walletTransactionId_fkey" FOREIGN KEY ("walletTransactionId") REFERENCES "WalletTransaction" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BillingPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "unitPrice" DECIMAL NOT NULL,
    "currency" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "effectiveAt" DATETIME NOT NULL,
    "remarks" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BillingPlan_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "balance" DECIMAL NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Wallet_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RechargeRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "paymentChannel" TEXT NOT NULL,
    "screenshotUrl" TEXT,
    "amount" DECIMAL NOT NULL,
    "currency" TEXT NOT NULL,
    "remarks" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "rejectReason" TEXT,
    "reviewedAt" DATETIME,
    "reviewerId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "walletTransactionId" TEXT,
    "attachmentId" TEXT,
    CONSTRAINT "RechargeRequest_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RechargeRequest_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "RechargeRequest_walletTransactionId_fkey" FOREIGN KEY ("walletTransactionId") REFERENCES "WalletTransaction" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "RechargeRequest_attachmentId_fkey" FOREIGN KEY ("attachmentId") REFERENCES "FileAsset" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WalletTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "walletId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "amount" DECIMAL NOT NULL,
    "currency" TEXT NOT NULL,
    "balanceBefore" DECIMAL NOT NULL,
    "balanceAfter" DECIMAL NOT NULL,
    "businessType" TEXT,
    "forecastId" TEXT,
    "forecastBoxId" TEXT,
    "trackingNo" TEXT,
    "rechargeRequestId" TEXT,
    "reversedFromTransactionId" TEXT,
    "remarks" TEXT,
    "operatorId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WalletTransaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "WalletTransaction_forecastId_fkey" FOREIGN KEY ("forecastId") REFERENCES "Forecast" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "WalletTransaction_forecastBoxId_fkey" FOREIGN KEY ("forecastBoxId") REFERENCES "ForecastBox" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "WalletTransaction_reversedFromTransactionId_fkey" FOREIGN KEY ("reversedFromTransactionId") REFERENCES "WalletTransaction" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "WalletTransaction_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT,
    "name" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "currency" TEXT NOT NULL,
    "expenseDate" DATETIME NOT NULL,
    "remarks" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "attachmentId" TEXT,
    CONSTRAINT "Expense_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Expense_attachmentId_fkey" FOREIGN KEY ("attachmentId") REFERENCES "FileAsset" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "customerId" TEXT,
    "userId" TEXT,
    "forecastId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AuditLog_forecastId_fkey" FOREIGN KEY ("forecastId") REFERENCES "Forecast" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FileAsset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "category" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "storageFilename" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedByUserId" TEXT,
    CONSTRAINT "FileAsset_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CustomerApiKey" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "remarks" TEXT,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastUsedAt" DATETIME,
    "expiresAt" DATETIME,
    "revokedAt" DATETIME,
    "rateLimitPerMinute" INTEGER NOT NULL DEFAULT 60,
    "createdByUserId" TEXT,
    "revokedByUserId" TEXT,
    CONSTRAINT "CustomerApiKey_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CustomerApiKey_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CustomerApiKey_revokedByUserId_fkey" FOREIGN KEY ("revokedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ApiRequestLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "apiKeyId" TEXT,
    "path" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "requestAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "success" BOOLEAN NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "requiredScope" TEXT,
    "rateLimited" BOOLEAN NOT NULL DEFAULT false,
    "forbidden" BOOLEAN NOT NULL DEFAULT false,
    "errorMessage" TEXT,
    CONSTRAINT "ApiRequestLog_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ApiRequestLog_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "CustomerApiKey" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CustomerApiKeyScope" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "apiKeyId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    CONSTRAINT "CustomerApiKeyScope_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "CustomerApiKey" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BoxExceptionHandlingRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "forecastBoxId" TEXT NOT NULL,
    "resolution" TEXT NOT NULL,
    "note" TEXT,
    "handledByUserId" TEXT NOT NULL,
    "handledAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BoxExceptionHandlingRecord_forecastBoxId_fkey" FOREIGN KEY ("forecastBoxId") REFERENCES "ForecastBox" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "BoxExceptionHandlingRecord_handledByUserId_fkey" FOREIGN KEY ("handledByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BoxExceptionHandlingAttachment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recordId" TEXT NOT NULL,
    "fileAssetId" TEXT NOT NULL,
    CONSTRAINT "BoxExceptionHandlingAttachment_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "BoxExceptionHandlingRecord" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "BoxExceptionHandlingAttachment_fileAssetId_fkey" FOREIGN KEY ("fileAssetId") REFERENCES "FileAsset" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FinanceArchive" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "archiveNo" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "customerId" TEXT,
    "dateFrom" DATETIME NOT NULL,
    "dateTo" DATETIME NOT NULL,
    "storagePath" TEXT NOT NULL,
    "downloadPath" TEXT NOT NULL,
    "fileAssetId" TEXT NOT NULL,
    "generatedByUserId" TEXT,
    "remarks" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FinanceArchive_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "FinanceArchive_fileAssetId_fkey" FOREIGN KEY ("fileAssetId") REFERENCES "FileAsset" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "FinanceArchive_generatedByUserId_fkey" FOREIGN KEY ("generatedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Customer_code_key" ON "Customer"("code");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Channel_name_key" ON "Channel"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Channel_code_key" ON "Channel"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Forecast_forecastNo_key" ON "Forecast"("forecastNo");

-- CreateIndex
CREATE UNIQUE INDEX "ForecastBox_boxNo_key" ON "ForecastBox"("boxNo");

-- CreateIndex
CREATE UNIQUE INDEX "ForecastBox_forecastId_boxIndex_key" ON "ForecastBox"("forecastId", "boxIndex");

-- CreateIndex
CREATE UNIQUE INDEX "ForecastBoxChannel_forecastBoxId_channelId_key" ON "ForecastBoxChannel"("forecastBoxId", "channelId");

-- CreateIndex
CREATE UNIQUE INDEX "TrackingScanRecord_walletTransactionId_key" ON "TrackingScanRecord"("walletTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_customerId_key" ON "Wallet"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "RechargeRequest_walletTransactionId_key" ON "RechargeRequest"("walletTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX "RechargeRequest_attachmentId_key" ON "RechargeRequest"("attachmentId");

-- CreateIndex
CREATE UNIQUE INDEX "WalletTransaction_rechargeRequestId_key" ON "WalletTransaction"("rechargeRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "Expense_attachmentId_key" ON "Expense"("attachmentId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerApiKey_keyHash_key" ON "CustomerApiKey"("keyHash");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerApiKeyScope_apiKeyId_scope_key" ON "CustomerApiKeyScope"("apiKeyId", "scope");

-- CreateIndex
CREATE UNIQUE INDEX "BoxExceptionHandlingAttachment_recordId_fileAssetId_key" ON "BoxExceptionHandlingAttachment"("recordId", "fileAssetId");

-- CreateIndex
CREATE UNIQUE INDEX "FinanceArchive_archiveNo_key" ON "FinanceArchive"("archiveNo");

-- CreateIndex
CREATE UNIQUE INDEX "FinanceArchive_fileAssetId_key" ON "FinanceArchive"("fileAssetId");
