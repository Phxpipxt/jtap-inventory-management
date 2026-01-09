/*
  Warnings:

  - A unique constraint covering the columns `[computerNo]` on the table `Asset` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[serialNo]` on the table `Asset` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE INDEX "Asset_status_idx" ON "Asset"("status");

-- CreateIndex
CREATE INDEX "Asset_department_idx" ON "Asset"("department");

-- CreateIndex
CREATE INDEX "Asset_purchaseDate_idx" ON "Asset"("purchaseDate");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_computerNo_key" ON "Asset"("computerNo");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_serialNo_key" ON "Asset"("serialNo");

-- CreateIndex
CREATE INDEX "AuditLog_date_idx" ON "AuditLog"("date");

-- CreateIndex
CREATE INDEX "AuditLog_status_idx" ON "AuditLog"("status");

-- CreateIndex
CREATE INDEX "LogEntry_assetId_idx" ON "LogEntry"("assetId");

-- CreateIndex
CREATE INDEX "LogEntry_timestamp_idx" ON "LogEntry"("timestamp");

-- CreateIndex
CREATE INDEX "LogEntry_action_idx" ON "LogEntry"("action");
