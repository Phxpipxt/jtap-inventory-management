-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "computerNo" TEXT NOT NULL,
    "serialNo" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "owner" TEXT,
    "empId" TEXT,
    "department" TEXT,
    "status" TEXT NOT NULL,
    "condition" TEXT,
    "purchaseDate" TIMESTAMP(3),
    "warrantyExpiry" TIMESTAMP(3),
    "tags" TEXT[],
    "remarks" TEXT,
    "hdd" TEXT,
    "ram" TEXT,
    "cpu" TEXT,
    "distributionDate" TIMESTAMP(3),
    "lastUpdated" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Image" (
    "id" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,

    CONSTRAINT "Image_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogEntry" (
    "id" TEXT NOT NULL,
    "assetId" TEXT,
    "computerNo" TEXT NOT NULL,
    "serialNo" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "adminUser" TEXT NOT NULL,
    "details" TEXT,

    CONSTRAINT "LogEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "totalAssets" INTEGER NOT NULL,
    "scannedCount" INTEGER NOT NULL,
    "missingCount" INTEGER NOT NULL,
    "scannedIds" TEXT[],
    "missingIds" TEXT[],
    "status" TEXT NOT NULL,
    "auditedBy" TEXT,
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "supervisor1VerifiedBy" TEXT,
    "supervisor1VerifiedAt" TIMESTAMP(3),
    "verificationStatus" TEXT,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogEntry" ADD CONSTRAINT "LogEntry_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
