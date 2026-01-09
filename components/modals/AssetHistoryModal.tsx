"use client";

import { Asset } from "@/lib/types";
import { useInventory } from "@/hooks/useInventory";
import { X, History, UserPlus, RotateCcw, Calendar, Tag, User, Hash, Monitor } from "lucide-react";
import { motion } from "framer-motion";

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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="flex h-full max-h-[85vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl overflow-hidden ring-1 ring-white/10"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex flex-col border-b border-slate-100 bg-slate-50/50 px-6 py-5">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                <History className="h-5 w-5" />
                            </div>
                            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Usage History</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer active:scale-95"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Asset Info Summary */}
                    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Asset Details</span>
                            <span className="text-xs font-mono text-slate-400">{asset.serialNo}</span>
                        </div>
                        <div className="text-2xl font-black text-slate-900 tracking-tight mb-1">{asset.computerNo}</div>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                            <span className="font-medium">{asset.brand} {asset.model}</span>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-white scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                    {assetLogs.length > 0 ? (
                        <div className="relative border-l-2 border-slate-100/80 ml-4 space-y-8 pb-4">
                            {assetLogs.map((log, index) => (
                                <motion.div
                                    key={log.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    className="relative pl-8 group"
                                >
                                    {/* Timeline Node */}
                                    <div className={`absolute -left-[11px] top-0 h-6 w-6 rounded-full border-4 border-white shadow-sm flex items-center justify-center transition-transform group-hover:scale-110 ${log.action === "Check-out" ? "bg-emerald-500" :
                                        log.action === "Check-in" ? "bg-amber-500" :
                                            "bg-slate-400"
                                        }`}>
                                        {log.action === "Check-out" ? (
                                            <UserPlus className="h-3 w-3 text-white" />
                                        ) : log.action === "Check-in" ? (
                                            <RotateCcw className="h-3 w-3 text-white" />
                                        ) : (
                                            <div className="h-2 w-2 bg-white rounded-full" />
                                        )}
                                    </div>

                                    {/* Content Card */}
                                    <div className="flex flex-col gap-2">
                                        <div className="flex items-center justify-between">
                                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ring-inset ${log.action === "Check-out" ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20" :
                                                log.action === "Check-in" ? "bg-amber-50 text-amber-700 ring-amber-600/20" :
                                                    "bg-slate-50 text-slate-600 ring-slate-500/10"
                                                }`}>
                                                {log.action === "Check-out" ? "Assigned" :
                                                    log.action === "Check-in" ? "Returned" :
                                                        log.action}
                                            </span>
                                            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                                                <Calendar className="w-3.5 h-3.5" />
                                                {new Date(log.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </div>
                                        </div>

                                        <div className="bg-slate-50 hover:bg-slate-100/80 transition-colors rounded-xl p-3 border border-slate-100">
                                            {log.action === "Check-out" && log.details?.startsWith("Assigned to") ? (
                                                (() => {
                                                    const nameMatch = log.details?.match(/Assigned to (.*?) \(/);
                                                    const metaMatch = log.details?.match(/\((.*?)\)/);
                                                    const name = nameMatch ? nameMatch[1] : log.details;
                                                    const meta = metaMatch ? metaMatch[1] : "";
                                                    return (
                                                        <div className="flex flex-col">
                                                            <div className="flex items-center gap-2 mb-0.5">
                                                                <User className="w-4 h-4 text-emerald-600" />
                                                                <span className="text-sm font-bold text-slate-900">{name}</span>
                                                            </div>
                                                            {meta && <span className="text-xs text-slate-500 font-medium pl-6">{meta}</span>}
                                                        </div>
                                                    );
                                                })()
                                            ) : log.action === "Check-in" && log.details?.startsWith("Returned from") ? (
                                                (() => {
                                                    const name = log.details?.replace("Returned from ", "");
                                                    return (
                                                        <div className="flex flex-col">
                                                            <div className="flex items-center gap-2 mb-0.5">
                                                                <User className="w-4 h-4 text-amber-600" />
                                                                <span className="text-sm font-bold text-slate-900">{name}</span>
                                                            </div>
                                                            <span className="text-xs text-slate-500 font-medium pl-6">Returned Asset to Inventory</span>
                                                        </div>
                                                    );
                                                })()
                                            ) : (
                                                <span className="text-sm text-slate-600 italic">{log.details || "No details provided"}</span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 pl-1">
                                            <span className="font-semibold uppercase tracking-wider">Logged by</span>
                                            <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium border border-slate-200">
                                                {log.adminUser}
                                            </span>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                <History className="h-8 w-8 text-slate-300" />
                            </div>
                            <h3 className="text-sm font-bold text-slate-900">No History Available</h3>
                            <p className="text-xs text-slate-500 mt-1 max-w-[200px]">
                                This asset has not been assigned or returned yet.
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-slate-100 bg-slate-50/80 backdrop-blur p-4">
                    <button
                        onClick={onClose}
                        className="w-full rounded-xl bg-white border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 hover:shadow-sm active:scale-[0.99] transition-all cursor-pointer"
                    >
                        Close History
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
