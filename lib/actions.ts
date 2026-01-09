"use server";

import { prisma } from "@/lib/prisma";
import { Asset, LogEntry, AuditLog, AssetStatus, Department } from "@/lib/types"; // Interfaces
import { revalidatePath } from "next/cache";

// --- Assets ---

export async function getAssets(): Promise<Asset[]> {
    const assets = await prisma.asset.findMany({
        include: {
            images: true,
        },
    });

    return assets.map((a) => ({
        ...a,
        status: a.status as AssetStatus,
        department: a.department as Department | null,
        brand: a.brand || undefined,
        model: a.model || undefined,
        owner: a.owner || undefined,
        empId: a.empId || undefined,
        remarks: a.remarks || undefined,
        issues: a.issues || undefined,
        hdd: a.hdd || undefined,
        ram: a.ram || undefined,
        cpu: a.cpu || undefined,
        images: a.images.map((img) => img.data),
        purchaseDate: a.purchaseDate ? a.purchaseDate.toISOString() : undefined,
        warrantyExpiry: a.warrantyExpiry ? a.warrantyExpiry.toISOString() : undefined,
        distributionDate: a.distributionDate ? a.distributionDate.toISOString() : undefined,
        lastUpdated: a.lastUpdated.toISOString(),
        tags: a.tags,
    }));
}

export async function createAsset(asset: Asset, adminUser: string, log?: LogEntry) {
    const { images, ...data } = asset;

    await prisma.$transaction(async (tx: any) => {
        // 1. Create Asset
        await tx.asset.create({
            data: {
                ...data,
                lastUpdated: new Date(),
                purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
                warrantyExpiry: data.warrantyExpiry ? new Date(data.warrantyExpiry) : null,
                distributionDate: data.distributionDate ? new Date(data.distributionDate) : null,
                updatedBy: adminUser,
                images: {
                    create: images?.map((img) => ({ data: img })) || []
                }
            }
        });

        // 2. Create Log (if provided)
        if (log) {
            await tx.logEntry.create({
                data: {
                    id: log.id,
                    assetId: log.assetId,
                    computerNo: log.computerNo,
                    serialNo: log.serialNo,
                    action: log.action,
                    adminUser: log.adminUser,
                    details: log.details,
                    timestamp: new Date(log.timestamp)
                }
            });
        }
    });

    revalidatePath("/inventory");
}

export async function updateAsset(asset: Asset, adminUser: string, action: string = "Update", details?: string) {
    const { images, ...data } = asset;

    // We need to handle images carefully: 
    // Simplified strategy: Delete all existing images for this asset and recreate them.
    // Efficient enough for 3 small base64 strings.

    await prisma.$transaction(async (tx: any) => {
        // 1. Update clean fields
        await tx.asset.update({
            where: { id: asset.id },
            data: {
                ...data,
                lastUpdated: new Date(),
                purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
                warrantyExpiry: data.warrantyExpiry ? new Date(data.warrantyExpiry) : null,
                distributionDate: data.distributionDate ? new Date(data.distributionDate) : null,
                updatedBy: adminUser,
            }
        });

        // 2. Handle Images
        if (images) {
            // Delete all old
            await tx.image.deleteMany({ where: { assetId: asset.id } });

            // Create new
            if (images.length > 0) {
                await tx.image.createMany({
                    data: images.map(img => ({
                        assetId: asset.id,
                        data: img
                    }))
                });
            }
        }

        // 3. Create Log
        await tx.logEntry.create({
            data: {
                id: crypto.randomUUID(),
                assetId: asset.id,
                computerNo: asset.computerNo,
                serialNo: asset.serialNo,
                action: action,
                adminUser: adminUser,
                details: details || `Asset ${asset.computerNo} updated`,
                timestamp: new Date()
            }
        });
    });

    revalidatePath("/inventory");
    revalidatePath("/logs");
}

export async function deleteAsset(id: string) {
    await prisma.asset.delete({ where: { id } });
    revalidatePath("/inventory");
}

export async function deleteAssets(ids: string[]) {
    await prisma.asset.deleteMany({ where: { id: { in: ids } } });
    revalidatePath("/inventory");
}


// --- Logs ---

export async function getLogs(): Promise<LogEntry[]> {
    const logs = await prisma.logEntry.findMany({
        orderBy: { timestamp: "desc" }
    });

    return logs.map((l: any) => ({
        ...l,
        timestamp: l.timestamp.toISOString(),
        action: l.action as any
    }));
}

export async function createLog(log: LogEntry) {
    await prisma.logEntry.create({
        data: {
            id: log.id,
            assetId: log.assetId,
            computerNo: log.computerNo,
            serialNo: log.serialNo,
            action: log.action,
            adminUser: log.adminUser,
            details: log.details,
            timestamp: new Date(log.timestamp)
        }
    });

    revalidatePath("/logs");
}

export async function createLogs(logs: LogEntry[]) {
    await prisma.logEntry.createMany({
        data: logs.map(log => ({
            id: log.id,
            assetId: log.assetId,
            computerNo: log.computerNo,
            serialNo: log.serialNo,
            action: log.action,
            adminUser: log.adminUser,
            details: log.details,
            timestamp: new Date(log.timestamp)
        }))
    });
    revalidatePath("/logs");
}

// --- Audits ---

export async function getAuditLogs(): Promise<AuditLog[]> {
    const audits = await prisma.auditLog.findMany({
        orderBy: { date: "desc" }
    });

    return audits.map((a: any) => ({
        ...a,
        date: a.date.toISOString(),
        status: a.status as any,
        verificationStatus: a.verificationStatus as any,
        verifiedAt: a.verifiedAt?.toISOString(),
        supervisor1VerifiedAt: a.supervisor1VerifiedAt?.toISOString(),
    }));
}

export async function saveAuditLog(log: AuditLog) {
    // Upsert to handle updates (e.g. verification steps)
    await prisma.auditLog.upsert({
        where: { id: log.id },
        update: {
            status: log.status,
            verificationStatus: log.verificationStatus,
            supervisor1VerifiedBy: log.supervisor1VerifiedBy,
            supervisor1VerifiedAt: log.supervisor1VerifiedAt ? new Date(log.supervisor1VerifiedAt) : null,
            // Map legacy fields too just in case
            verifiedBy: log.verifiedBy,
            verifiedAt: log.verifiedAt ? new Date(log.verifiedAt) : null,
        },
        create: {
            id: log.id,
            date: new Date(log.date),
            totalAssets: log.totalAssets,
            scannedCount: log.scannedCount,
            missingCount: log.missingCount,
            scannedIds: log.scannedIds,
            missingIds: log.missingIds || [],
            status: log.status,
            auditedBy: log.auditedBy,
            verificationStatus: log.verificationStatus,
        }
    });
    revalidatePath("/audit-history");
}
