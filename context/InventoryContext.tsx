"use client";

import React, { createContext, useContext } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Asset, LogEntry, AuditLog } from "@/lib/types";
import {
    getAssets, getLogs, getAuditLogs,
    createAsset as createAssetAction,
    updateAsset as updateAssetAction,
    deleteAsset as deleteAssetAction,
    deleteAssets as deleteAssetsAction,
    createLog,
    createLogs,
    saveAuditLog as saveAuditLogAction
} from "@/lib/actions";

interface InventoryContextType {
    assets: Asset[];
    logs: LogEntry[];
    auditLogs: AuditLog[];
    loading: boolean;
    logsLoading: boolean;
    auditLogsLoading: boolean;
    addAsset: (asset: Asset, adminUser: string) => Promise<void>;
    addAssets: (newAssetsList: Asset[], adminUser: string, action?: "Add" | "Import") => Promise<void>;
    updateAsset: (updatedAsset: Asset, adminUser: string, action: "Check-in" | "Check-out" | "Update" | "Dispose", details?: string) => Promise<void>;
    deleteAsset: (assetId: string, adminUser: string, reason?: string) => Promise<void>;
    deleteAssets: (assetIds: string[], adminUser: string, reason?: string) => Promise<void>;
    saveAuditLog: (log: AuditLog) => Promise<void>;
    verifyAuditLog: (logId: string, verifier: string, step: 1 | 2) => Promise<void>;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export function InventoryProvider({ children }: { children: React.ReactNode }) {
    const queryClient = useQueryClient();

    // Queries
    const { data: assets = [], isLoading: assetsLoading } = useQuery({
        queryKey: ["assets"],
        queryFn: getAssets,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    const { data: logs = [], isLoading: logsLoading } = useQuery({
        queryKey: ["logs"],
        queryFn: getLogs,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    const { data: auditLogs = [], isLoading: auditLogsLoading } = useQuery({
        queryKey: ["auditLogs"],
        queryFn: getAuditLogs,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    // Optimization: Only block UI on critical 'assets' data. 
    // Logs and Audits can load in background to speed up initial paint.
    const loading = assetsLoading;

    // Mutations with Optimistic Updates

    const addAssetMutation = useMutation({
        mutationFn: async ({ asset, adminUser }: { asset: Asset; adminUser: string }) => {
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
            await createAssetAction(asset, adminUser, log);
            // await createLog(log); // Handled in createAssetAction transaction
            return { asset, log };
        },
        onMutate: async ({ asset, adminUser }) => {
            await queryClient.cancelQueries({ queryKey: ["assets"] });
            await queryClient.cancelQueries({ queryKey: ["logs"] });

            const previousAssets = queryClient.getQueryData<Asset[]>(["assets"]);
            const previousLogs = queryClient.getQueryData<LogEntry[]>(["logs"]);

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

            queryClient.setQueryData<Asset[]>(["assets"], (old = []) => [asset, ...old]);
            queryClient.setQueryData<LogEntry[]>(["logs"], (old = []) => [log, ...old]);

            return { previousAssets, previousLogs };
        },
        onError: (_err, _newAsset, context) => {
            queryClient.setQueryData(["assets"], context?.previousAssets);
            queryClient.setQueryData(["logs"], context?.previousLogs);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["assets"] });
            queryClient.invalidateQueries({ queryKey: ["logs"] });
        },
    });

    const updateAssetMutation = useMutation({
        mutationFn: async ({ updatedAsset, adminUser, action, details }: { updatedAsset: Asset; adminUser: string; action: "Check-in" | "Check-out" | "Update" | "Dispose"; details?: string }) => {
            // Fetch current asset for distribution date logic if needed, but for mutation we just trust passed data + action
            // However, for the 'Check-in' log detail logic (Distributed: date), we need the old asset. 
            // We can pass it or fetch it, but let's assume client handles detail formatting or we keep it simple.
            // Re-implementing logic from original:
            const logDetail = action === "Check-in" ? details : details; // Simplified as per request

            const log: LogEntry = {
                id: crypto.randomUUID(),
                assetId: updatedAsset.id,
                computerNo: updatedAsset.computerNo,
                serialNo: updatedAsset.serialNo,
                action,
                timestamp: new Date().toISOString(),
                adminUser,
                details: logDetail,
            };

            await updateAssetAction(updatedAsset, adminUser);
            await createLog(log);
            return { updatedAsset, log };
        },
        onMutate: async ({ updatedAsset, adminUser, action, details }) => {
            await queryClient.cancelQueries({ queryKey: ["assets"] });
            await queryClient.cancelQueries({ queryKey: ["logs"] });

            const previousAssets = queryClient.getQueryData<Asset[]>(["assets"]);
            const previousLogs = queryClient.getQueryData<LogEntry[]>(["logs"]);

            const logDetail = details;

            const log: LogEntry = {
                id: crypto.randomUUID(),
                assetId: updatedAsset.id,
                computerNo: updatedAsset.computerNo,
                serialNo: updatedAsset.serialNo,
                action,
                timestamp: new Date().toISOString(),
                adminUser,
                details: logDetail,
            };

            queryClient.setQueryData<Asset[]>(["assets"], (old = []) =>
                old.map((a) => (a.id === updatedAsset.id ? updatedAsset : a))
            );
            queryClient.setQueryData<LogEntry[]>(["logs"], (old = []) => [log, ...old]);

            return { previousAssets, previousLogs };
        },
        onError: (_err, _vars, context) => {
            queryClient.setQueryData(["assets"], context?.previousAssets);
            queryClient.setQueryData(["logs"], context?.previousLogs);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["assets"] });
            queryClient.invalidateQueries({ queryKey: ["logs"] });
        },
    });

    const deleteAssetMutation = useMutation({
        mutationFn: async ({ assetId, adminUser, reason }: { assetId: string; adminUser: string; reason?: string }) => {
            const assetToDelete = assets.find(a => a.id === assetId);
            if (!assetToDelete) return; // Should not happen

            const log: LogEntry = {
                id: crypto.randomUUID(),
                assetId: assetId,
                computerNo: assetToDelete.computerNo,
                serialNo: assetToDelete.serialNo,
                action: "Delete",
                timestamp: new Date().toISOString(),
                adminUser,
                details: reason ? `Asset deleted: ${reason}` : "Asset deleted from inventory",
            };

            await createLog(log);
            await deleteAssetAction(assetId);
        },
        onMutate: async ({ assetId, adminUser, reason }) => {
            await queryClient.cancelQueries({ queryKey: ["assets"] });
            await queryClient.cancelQueries({ queryKey: ["logs"] });

            const previousAssets = queryClient.getQueryData<Asset[]>(["assets"]) || [];
            const previousLogs = queryClient.getQueryData<LogEntry[]>(["logs"]) || [];

            const assetToDelete = previousAssets.find(a => a.id === assetId);
            if (!assetToDelete) return { previousAssets, previousLogs };

            const log: LogEntry = {
                id: crypto.randomUUID(),
                assetId: assetId,
                computerNo: assetToDelete.computerNo,
                serialNo: assetToDelete.serialNo,
                action: "Delete",
                timestamp: new Date().toISOString(),
                adminUser,
                details: reason ? `Asset deleted: ${reason}` : "Asset deleted from inventory",
            };

            queryClient.setQueryData<Asset[]>(["assets"], (old = []) => old.filter(a => a.id !== assetId));
            queryClient.setQueryData<LogEntry[]>(["logs"], (old = []) => [log, ...old]);

            return { previousAssets, previousLogs };
        },
        onError: (_err, _vars, context) => {
            if (context) {
                queryClient.setQueryData(["assets"], context.previousAssets);
                queryClient.setQueryData(["logs"], context.previousLogs);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["assets"] });
            queryClient.invalidateQueries({ queryKey: ["logs"] });
        },
    });

    const deleteAssetsBatchMutation = useMutation({
        mutationFn: async ({ assetIds, adminUser, reason }: { assetIds: string[]; adminUser: string; reason?: string }) => {
            const assetsToDelete = assets.filter(a => assetIds.includes(a.id));
            const timestamp = new Date().toISOString();
            const newLogs: LogEntry[] = assetsToDelete.map(asset => ({
                id: crypto.randomUUID(),
                assetId: asset.id,
                computerNo: asset.computerNo,
                serialNo: asset.serialNo,
                action: "Delete",
                timestamp,
                adminUser,
                details: reason ? `Batch delete: ${reason}` : "Batch delete",
            }));

            await createLogs(newLogs);
            await deleteAssetsAction(assetIds);
        },
        onMutate: async ({ assetIds, adminUser, reason }) => {
            await queryClient.cancelQueries({ queryKey: ["assets"] });
            await queryClient.cancelQueries({ queryKey: ["logs"] });

            const previousAssets = queryClient.getQueryData<Asset[]>(["assets"]) || [];
            const previousLogs = queryClient.getQueryData<LogEntry[]>(["logs"]) || [];

            const assetsToDelete = previousAssets.filter(a => assetIds.includes(a.id));
            if (!assetsToDelete.length) return { previousAssets, previousLogs };

            const timestamp = new Date().toISOString();
            const newLogs: LogEntry[] = assetsToDelete.map(asset => ({
                id: crypto.randomUUID(),
                assetId: asset.id,
                computerNo: asset.computerNo,
                serialNo: asset.serialNo,
                action: "Delete",
                timestamp,
                adminUser,
                details: reason ? `Batch delete: ${reason}` : "Batch delete",
            }));

            queryClient.setQueryData<Asset[]>(["assets"], (old = []) => old.filter(a => !assetIds.includes(a.id)));
            queryClient.setQueryData<LogEntry[]>(["logs"], (old = []) => [...newLogs, ...old]);

            return { previousAssets, previousLogs };
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["assets"] });
            queryClient.invalidateQueries({ queryKey: ["logs"] });
        },
    });

    const addAssetsBatchMutation = useMutation({
        mutationFn: async ({ newAssetsList, adminUser, action = "Add" }: { newAssetsList: Asset[]; adminUser: string; action?: "Add" | "Import" }) => {
            // Sequential execution to ensure distinct transactions and log creation
            // This mirrors the "Manual Add" logic which is known to work reliably.

            let currentAssets = [...assets]; // Local copy to track state during import loop

            for (const newAsset of newAssetsList) {
                const existingIndex = currentAssets.findIndex(
                    a => a.computerNo === newAsset.computerNo || a.serialNo === newAsset.serialNo
                );

                if (existingIndex >= 0) {
                    // UPDATE Existing Asset
                    const existingAsset = currentAssets[existingIndex];
                    const updatedAsset = { ...newAsset, id: existingAsset.id };
                    currentAssets[existingIndex] = updatedAsset;

                    const log: LogEntry = {
                        id: crypto.randomUUID(),
                        assetId: existingAsset.id,
                        computerNo: newAsset.computerNo,
                        serialNo: newAsset.serialNo,
                        action: "Update",
                        timestamp: new Date().toISOString(),
                        adminUser,
                        details: "Batch import overwrite",
                    };

                    // Execute sequentially
                    await updateAssetAction(updatedAsset, adminUser);
                    await createLog(log);

                } else {
                    // CREATE New Asset
                    currentAssets.push(newAsset);

                    const log: LogEntry = {
                        id: crypto.randomUUID(),
                        assetId: newAsset.id,
                        computerNo: newAsset.computerNo,
                        serialNo: newAsset.serialNo,
                        action: action as any,
                        timestamp: new Date().toISOString(),
                        adminUser,
                        details: "Batch import",
                    };

                    // Pass log to createAssetAction for transactional creation
                    await createAssetAction(newAsset, adminUser, log);
                }
            }
        },
        onMutate: async ({ newAssetsList, adminUser, action }) => {
            await queryClient.cancelQueries({ queryKey: ["assets"] });
            await queryClient.cancelQueries({ queryKey: ["logs"] });

            // Optimistic logic (same as mutationFn but updates cache)
            const previousAssets = queryClient.getQueryData<Asset[]>(["assets"]) || [];
            const previousLogs = queryClient.getQueryData<LogEntry[]>(["logs"]) || [];

            // ... logic to calc optimistic state ...
            // Be lazy here: Refetching is safer for batch. 
            // But for consistency let's try basic optimistic or just refetch.
            // Given complexity, let's just Optimistically add everything and assume success?
            // Or actually, simple invalidation is safer for batch imports.
            // Let's rely on invalidation for Batch Import to avoid code duplication bugs.

            return { previousAssets, previousLogs };
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["assets"] });
            queryClient.invalidateQueries({ queryKey: ["logs"] });
        }
    });

    const saveAuditLogMutation = useMutation({
        mutationFn: async (log: AuditLog) => {
            await saveAuditLogAction(log);
        },
        onMutate: async (log) => {
            await queryClient.cancelQueries({ queryKey: ["auditLogs"] });
            const previousAudits = queryClient.getQueryData<AuditLog[]>(["auditLogs"]);

            queryClient.setQueryData<AuditLog[]>(["auditLogs"], (old = []) => {
                const filtered = old.filter(l => l.id !== log.id);
                return [log, ...filtered].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            });

            return { previousAudits };
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["auditLogs"] });
        }
    });

    // Wrapper functions
    const addAsset = async (asset: Asset, adminUser: string) => {
        await addAssetMutation.mutateAsync({ asset, adminUser });
    };

    const addAssets = async (newAssetsList: Asset[], adminUser: string, action: "Add" | "Import" = "Add") => {
        await addAssetsBatchMutation.mutateAsync({ newAssetsList, adminUser, action });
    };

    const updateAsset = async (updatedAsset: Asset, adminUser: string, action: "Check-in" | "Check-out" | "Update" | "Dispose", details?: string) => {
        await updateAssetMutation.mutateAsync({ updatedAsset, adminUser, action, details });
    };

    const deleteAsset = async (assetId: string, adminUser: string, reason?: string) => {
        await deleteAssetMutation.mutateAsync({ assetId, adminUser, reason });
    };

    const deleteAssets = async (assetIds: string[], adminUser: string, reason?: string) => {
        await deleteAssetsBatchMutation.mutateAsync({ assetIds, adminUser, reason });
    };

    const saveAuditLog = async (log: AuditLog) => {
        await saveAuditLogMutation.mutateAsync(log);
    };

    const verifyAuditLog = async (logId: string, verifier: string, step: 1 | 2) => {
        // Logic is simple update to auditLog object, reuse saveAuditLogMutation logic?
        // Or create specific mutation? Can reuse saveAuditLog wrapper but we need to construct the object.
        // We need latest audit logs to find the object.
        const logToUpdate = auditLogs.find(l => l.id === logId);
        if (!logToUpdate) return;

        let updatedLog: AuditLog;
        if (step === 1) {
            updatedLog = {
                ...logToUpdate,
                supervisor1VerifiedBy: verifier,
                supervisor1VerifiedAt: new Date().toISOString(),
                verificationStatus: "Supervisor 1 Verified"
            };
        } else {
            updatedLog = {
                ...logToUpdate,
                verificationStatus: "Verified",
                verifiedBy: verifier,
                verifiedAt: new Date().toISOString(),
            };
            // Note: Typescript might complain about modifying read-only from query cache if strict.
            // But verifyAuditLog in context is supposed to be simple.
        }
        await saveAuditLogMutation.mutateAsync(updatedLog);
    };

    const value = React.useMemo(() => ({
        assets,
        logs,
        auditLogs,
        loading,
        logsLoading,
        auditLogsLoading,
        addAsset,
        addAssets,
        updateAsset,
        deleteAsset,
        deleteAssets,
        saveAuditLog,
        verifyAuditLog
    }), [assets, logs, auditLogs, loading, logsLoading, auditLogsLoading, addAssetMutation, addAssetsBatchMutation, updateAssetMutation, deleteAssetMutation, saveAuditLogMutation]);

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
