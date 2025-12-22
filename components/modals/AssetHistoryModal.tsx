"use client";

import { Asset } from "@/lib/types";
import { useInventory } from "@/hooks/useInventory";
import { X, History } from "lucide-react";

interface AssetHistoryModalProps {
    asset: Asset;
    isOpen: boolean;
    onClose: () => void;
}

export function AssetHistoryModal({ asset, isOpen, onClose }: AssetHistoryModalProps) {
    const { logs } = useInventory();

    if (!isOpen) return null;

    const assetLogs = logs
        .filter(log => log.assetId === asset.id && (log.action === "Check-in" || log.action === "Check-out"))
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div className="flex h-full max-h-[85vh] w-full max-w-md flex-col rounded-xl bg-white shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <History className="h-5 w-5 text-blue-600" />
                            <h2 className="text-lg font-bold text-slate-900">Usage History</h2>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            Computer No: {asset.computerNo}, Serial No: {asset.serialNo}, {asset.brand} {asset.model}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-white">
                    {assetLogs.length > 0 ? (
                        <div className="relative border-l-2 border-slate-100 ml-3 space-y-8 pb-4">
                            {assetLogs.map((log) => (
                                <div key={log.id} className="relative pl-6 group">
                                    <div className={`absolute -left-[9px] top-1.5 h-4 w-4 rounded-full border-[3px] border-white shadow-sm transition-transform group-hover:scale-110 ${log.action === "Check-out" ? "bg-green-500" :
                                        log.action === "Check-in" ? "bg-red-500" :
                                            "bg-slate-300"
                                        }`}></div>
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-start justify-between">
                                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${log.action === "Check-out" ? "bg-green-50 text-green-700 border border-green-100" :
                                                log.action === "Check-in" ? "bg-red-50 text-red-700 border border-red-100" :
                                                    "bg-slate-50 text-slate-600 border border-slate-100"
                                                }`}>
                                                {log.action === "Check-out" ? "Assigned" :
                                                    log.action === "Check-in" ? "Returned" :
                                                        log.action}
                                            </span>
                                            <span className="text-xs text-slate-400">
                                                {new Date(log.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </span>
                                        </div>

                                        {log.action === "Check-out" && log.details?.startsWith("Assigned to") ? (
                                            // Parse "Assigned to Name (ID: XXX, Dept: YYY)"
                                            (() => {
                                                const nameMatch = log.details?.match(/Assigned to (.*?) \(/);
                                                const metaMatch = log.details?.match(/\((.*?)\)/);
                                                const name = nameMatch ? nameMatch[1] : log.details;
                                                const meta = metaMatch ? metaMatch[1] : "";

                                                return (
                                                    <div className="flex flex-col mt-0.5">
                                                        <span className="text-sm font-bold text-slate-900">{name}</span>
                                                        {meta && <span className="text-xs text-slate-500 font-medium">{meta}</span>}
                                                    </div>
                                                );
                                            })()
                                        ) : log.action === "Check-in" && log.details?.startsWith("Returned from") ? (
                                            // Parse "Returned from Name"
                                            (() => {
                                                const name = log.details?.replace("Returned from ", "");
                                                return (
                                                    <div className="flex flex-col mt-0.5">
                                                        <span className="text-sm font-bold text-slate-900">{name}</span>
                                                        <span className="text-xs text-slate-500 font-medium">Returned Asset</span>
                                                    </div>
                                                );
                                            })()
                                        ) : log.details ? (
                                            <span className="text-sm font-medium text-slate-800 mt-1">
                                                {log.details}
                                            </span>
                                        ) : (
                                            <span className="text-sm text-slate-500 italic mt-1">
                                                No details provided
                                            </span>
                                        )}

                                        <div className="flex items-center gap-2 mt-2">
                                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100 uppercase tracking-wide">
                                                <span>Action by:</span>
                                                <span className="font-semibold text-slate-600">{log.adminUser}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full py-12 text-center text-slate-400">
                            <History className="h-12 w-12 mb-3 opacity-20" />
                            <p className="text-sm font-medium">No history records found</p>
                            <p className="text-xs opacity-75 mt-1">This asset hasn't been assigned or returned yet.</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-slate-100 bg-slate-50 p-4">
                    <button
                        onClick={onClose}
                        className="w-full rounded-lg bg-white border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:ring-offset-1 shadow-sm transition-all cursor-pointer"
                    >
                        Close History
                    </button>
                </div>
            </div>
        </div>
    );
}
