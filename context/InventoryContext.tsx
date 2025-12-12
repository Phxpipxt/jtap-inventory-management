"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { Asset, LogEntry, AuditLog } from "@/lib/types";
import { saveImagesToDB, getImagesFromDB, deleteImageFromDB } from "@/lib/db";

const ASSETS_KEY = "inventory_assets";
const LOGS_KEY = "inventory_logs";

interface InventoryContextType {
    assets: Asset[];
    logs: LogEntry[];
    loading: boolean;
    addAsset: (asset: Asset, adminUser: string) => Promise<void>;
    addAssets: (newAssetsList: Asset[], adminUser: string) => Promise<void>;
    updateAsset: (updatedAsset: Asset, adminUser: string, action: "Check-in" | "Check-out" | "Update", details?: string) => Promise<void>;
    deleteAsset: (assetId: string, adminUser: string) => Promise<void>;
    deleteAssets: (assetIds: string[], adminUser: string) => Promise<void>;
    auditLogs: import("@/lib/types").AuditLog[];
    saveAuditLog: (log: import("@/lib/types").AuditLog) => void;
    verifyAuditLog: (logId: string, verifier: string, step: 1 | 2) => void;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export function InventoryProvider({ children }: { children: React.ReactNode }) {
    const [assets, setAssets] = useState<Asset[]>([]);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);

    // Refs to hold current state for event handlers to avoid stale closures
    const assetsRef = useRef(assets);
    const logsRef = useRef(logs);
    const auditLogsRef = useRef(auditLogs);

    useEffect(() => {
        assetsRef.current = assets;
    }, [assets]);

    useEffect(() => {
        logsRef.current = logs;
    }, [logs]);

    useEffect(() => {
        auditLogsRef.current = auditLogs;
    }, [auditLogs]);

    useEffect(() => {
        const loadData = async () => {
            const storedAssets = localStorage.getItem(ASSETS_KEY);
            const storedLogs = localStorage.getItem(LOGS_KEY);
            const storedAuditLogs = localStorage.getItem("inventory_audit_logs");

            if (storedAssets) {
                let parsedAssets: Asset[] = JSON.parse(storedAssets);

                // Data Migration: Rename OMD -> OD, PUR -> PU
                let hasChanges = false;
                parsedAssets = parsedAssets.map(asset => {
                    // Migrate Department
                    if (asset.department === "OMD" as any) {
                        hasChanges = true;
                        asset.department = "OD";
                    }
                    if (asset.department === "PUR" as any) {
                        hasChanges = true;
                        asset.department = "PU";
                    }

                    // Migrate Status
                    if (asset.status === "Assigned" as any) {
                        hasChanges = true;
                        asset.status = "In Use";
                    }
                    if (asset.status === "Broken" as any || asset.status === "Maintenance" as any) {
                        hasChanges = true;
                        asset.status = "Resign";
                    }

                    return asset;
                });

                // Load images from IndexedDB and merge
                const assetsWithImages = await Promise.all(parsedAssets.map(async (asset) => {
                    try {
                        // Load images array (backward compatible with single image)
                        const images = await getImagesFromDB(asset.id);
                        if (images && images.length > 0) {
                            return { ...asset, images };
                        }
                    } catch (e) {
                        console.error(`Failed to load images for asset ${asset.id}`, e);
                    }
                    return asset;
                }));

                setAssets(assetsWithImages);

                // We don't save back immediately here unless migration happened, 
                // but if we do, we must ensure we use the stripped version.
                if (hasChanges) {
                    saveAssetsToStorage(parsedAssets); // parsedAssets doesn't have images yet, which is what we want for localStorage
                }
            }
            if (storedLogs) setLogs(JSON.parse(storedLogs));
            if (storedAuditLogs) setAuditLogs(JSON.parse(storedAuditLogs));

            setLoading(false);
        };

        loadData();
    }, []);

    // Helper to save assets to local storage WITHOUT images
    const saveAssetsToStorage = (assetsToSave: Asset[]) => {
        // Strip both 'image' and 'images' before saving to localStorage
        const assetsWithoutImages = assetsToSave.map(({ image, images, ...rest }) => rest);
        try {
            localStorage.setItem(ASSETS_KEY, JSON.stringify(assetsWithoutImages));
        } catch (error) {
            console.error("Failed to save assets to localStorage", error);
            alert("Failed to save data. Storage quota exceeded.");
        }
    };

    const saveLogs = (newLogs: LogEntry[]) => {
        setLogs(newLogs);
        try {
            localStorage.setItem(LOGS_KEY, JSON.stringify(newLogs));
        } catch (e) {
            console.error("Failed to save logs", e);
            // If logs fail, we might want to truncate old logs.
        }
    };

    const saveAuditLog = (log: AuditLog) => {
        const newAuditLogs = [log, ...auditLogsRef.current];
        setAuditLogs(newAuditLogs);
        localStorage.setItem("inventory_audit_logs", JSON.stringify(newAuditLogs));
    };

    const addAsset = async (asset: Asset, adminUser: string) => {
        // 1. Save images to DB if exists
        if (asset.images && asset.images.length > 0) {
            await saveImagesToDB(asset.id, asset.images);
        }

        // 2. Update state (keep images in memory)
        const newAssets = [...assetsRef.current, asset];
        setAssets(newAssets);

        // 3. Save to localStorage (strip images)
        saveAssetsToStorage(newAssets);

        const log: LogEntry = {
            id: crypto.randomUUID(),
            assetId: asset.id,
            computerNo: asset.computerNo,
            serialNo: asset.serialNo,
            action: "Add",
            timestamp: new Date().toISOString(),
            adminUser,
            details: "Initial stock in",
        };
        saveLogs([log, ...logsRef.current]);
    };

    const addAssets = async (newAssetsList: Asset[], adminUser: string) => {
        let updatedAssets = [...assetsRef.current];
        const logsToAdd: LogEntry[] = [];

        for (const newAsset of newAssetsList) {
            // Use partial match (||) to find existing asset to update.
            // This ensures that if we have a match on EITHER Computer No OR Serial No,
            // we update that asset instead of creating a duplicate.
            // This is crucial for "Replace" functionality in Import.
            const existingIndex = updatedAssets.findIndex(
                a => a.computerNo === newAsset.computerNo || a.serialNo === newAsset.serialNo
            );

            if (existingIndex >= 0) {
                // Update existing asset
                const existingAsset = updatedAssets[existingIndex];

                // Handle image update
                if (newAsset.images && newAsset.images.length > 0) {
                    await saveImagesToDB(existingAsset.id, newAsset.images);
                }

                updatedAssets[existingIndex] = { ...newAsset, id: existingAsset.id }; // Keep original ID

                logsToAdd.push({
                    id: crypto.randomUUID(),
                    assetId: existingAsset.id,
                    computerNo: newAsset.computerNo,
                    serialNo: newAsset.serialNo,
                    action: "Update",
                    timestamp: new Date().toISOString(),
                    adminUser,
                    details: "Batch import overwrite",
                });
            } else {
                // Add new asset
                if (newAsset.images && newAsset.images.length > 0) {
                    await saveImagesToDB(newAsset.id, newAsset.images);
                }

                updatedAssets.push(newAsset);
                logsToAdd.push({
                    id: crypto.randomUUID(),
                    assetId: newAsset.id,
                    computerNo: newAsset.computerNo,
                    serialNo: newAsset.serialNo,
                    action: "Add",
                    timestamp: new Date().toISOString(),
                    adminUser,
                    details: "Batch import",
                });
            }
        }

        setAssets(updatedAssets);
        saveAssetsToStorage(updatedAssets);
        saveLogs([...logsToAdd, ...logsRef.current]);
    };

    const updateAsset = async (updatedAsset: Asset, adminUser: string, action: "Check-in" | "Check-out" | "Update", details?: string) => {
        const oldAsset = assetsRef.current.find(a => a.id === updatedAsset.id);

        // Handle images update
        if (updatedAsset.images && updatedAsset.images.length > 0) {
            await saveImagesToDB(updatedAsset.id, updatedAsset.images);
        } else {
            // If images is explicitly empty or undefined, check if we need to delete
            if (oldAsset?.images && (!updatedAsset.images || updatedAsset.images.length === 0)) {
                await deleteImageFromDB(updatedAsset.id);
            }
        }

        const newAssets = assetsRef.current.map((a) => (a.id === updatedAsset.id ? updatedAsset : a));
        setAssets(newAssets);
        saveAssetsToStorage(newAssets);

        const log: LogEntry = {
            id: crypto.randomUUID(),
            assetId: updatedAsset.id,
            computerNo: updatedAsset.computerNo,
            serialNo: updatedAsset.serialNo,
            action,
            timestamp: new Date().toISOString(),
            adminUser,
            details: action === "Check-in" && oldAsset?.distributionDate
                ? `${details} (Distributed: ${new Date(oldAsset.distributionDate).toLocaleDateString()})`
                : details,
        };
        saveLogs([log, ...logsRef.current]);
    };

    const deleteAsset = async (assetId: string, adminUser: string) => {
        const assetToDelete = assetsRef.current.find(a => a.id === assetId);
        if (!assetToDelete) return;

        await deleteImageFromDB(assetId);

        const newAssets = assetsRef.current.filter((a) => a.id !== assetId);
        setAssets(newAssets);
        saveAssetsToStorage(newAssets);

        const log: LogEntry = {
            id: crypto.randomUUID(),
            assetId: assetId,
            computerNo: assetToDelete.computerNo,
            serialNo: assetToDelete.serialNo,
            action: "Delete",
            timestamp: new Date().toISOString(),
            adminUser,
            details: "Asset deleted from inventory",
        };
        saveLogs([log, ...logsRef.current]);
    };

    const verifyAuditLog = (logId: string, verifier: string, step: 1 | 2) => {
        const updatedLogs = auditLogsRef.current.map(log => {
            if (log.id === logId) {
                if (step === 1) {
                    return {
                        ...log,
                        supervisor1VerifiedBy: verifier,
                        supervisor1VerifiedAt: new Date().toISOString(),
                        verificationStatus: "Supervisor 1 Verified" as const
                    };
                } else if (step === 2) {
                    return {
                        ...log,
                        supervisor2VerifiedBy: verifier,
                        supervisor2VerifiedAt: new Date().toISOString(),
                        verificationStatus: "Verified" as const,
                        // Update legacy fields for backward compatibility
                        verifiedBy: verifier,
                        verifiedAt: new Date().toISOString(),
                    };
                }
            }
            return log;
        });
        setAuditLogs(updatedLogs);
        localStorage.setItem("inventory_audit_logs", JSON.stringify(updatedLogs));
    };

    const deleteAssets = async (assetIds: string[], adminUser: string) => {
        const assetsToDelete = assetsRef.current.filter(a => assetIds.includes(a.id));
        if (assetsToDelete.length === 0) return;

        // Delete images
        await Promise.all(assetIds.map(id => deleteImageFromDB(id)));

        const newAssets = assetsRef.current.filter((a) => !assetIds.includes(a.id));
        setAssets(newAssets);
        saveAssetsToStorage(newAssets);

        const newLogs: LogEntry[] = assetsToDelete.map(asset => ({
            id: crypto.randomUUID(),
            assetId: asset.id,
            computerNo: asset.computerNo,
            serialNo: asset.serialNo,
            action: "Delete",
            timestamp: new Date().toISOString(),
            adminUser,
            details: "Batch delete",
        }));
        saveLogs([...newLogs, ...logsRef.current]);
    };

    const value = React.useMemo(() => ({
        assets,
        logs,
        auditLogs,
        loading,
        addAsset,
        addAssets,
        updateAsset,
        deleteAsset,
        deleteAssets,
        saveAuditLog,
        verifyAuditLog
    }), [assets, logs, auditLogs, loading]);

    return (
        <InventoryContext.Provider value={value}>
            {children}
        </InventoryContext.Provider>
    );
}

export function useInventoryContext() {
    const context = useContext(InventoryContext);
    if (context === undefined) {
        throw new Error("useInventoryContext must be used within an InventoryProvider");
    }
    return context;
}
