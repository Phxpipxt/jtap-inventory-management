"use client";

import { useState } from "react";
import { Asset } from "@/lib/types";
import { X, Download, Maximize2, Tag, Calendar, User, Building, Hash, Cpu, HardDrive, Pencil, History as HistoryIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface AssetDetailModalProps {
    asset: Asset;
    isOpen: boolean;
    onClose: () => void;
    onEdit?: () => void;
    onHistory?: () => void;
}

export function AssetDetailModal({ asset, isOpen, onClose, onEdit, onHistory }: AssetDetailModalProps) {
    const [expandedImage, setExpandedImage] = useState<string | null>(null);

    const handleDownload = (imageUrl: string, fileName: string) => {
        const link = document.createElement("a");
        link.href = imageUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 h-[100dvh] w-screen touch-none" onClick={onClose} key="modal-backdrop">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            aria-hidden="true"
                        />

                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
                            className="relative w-full max-w-5xl rounded-2xl bg-white/95 shadow-2xl backdrop-blur-xl ring-1 ring-black/5 max-h-[90dvh] overflow-hidden flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                            key="modal-content"
                        >
                            {/* Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/20 px-6 sm:px-8 py-5 bg-white/50 gap-4 sm:gap-0">
                                <div>
                                    <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent">
                                        Asset Details
                                    </h2>
                                    <div className="flex flex-wrap items-center gap-3 mt-1.5">
                                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ring-inset ${asset.status === "In Stock" ? "bg-green-50 text-green-700 ring-green-600/20" :
                                            asset.status === "In Use" ? "bg-blue-50 text-blue-700 ring-blue-700/10" :
                                                "bg-orange-50 text-orange-700 ring-orange-600/20"
                                            }`}>
                                            {asset.status}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="absolute top-4 right-4 sm:static rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all active:scale-95 cursor-pointer"
                                >
                                    <X className="h-6 w-6" />
                                </button>
                            </div>

                            {/* Scrollable Content */}
                            <div className="flex-1 overflow-y-auto p-6 sm:p-8 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-200">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                                    {/* Left Column: Images & Key Specs */}
                                    <div className="space-y-6">
                                        {/* Images Gallery */}
                                        {(asset.images?.length || asset.image) && (
                                            <div className="space-y-3">
                                                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide opacity-75">Asset Image</h3>
                                                <div className="grid grid-cols-2 gap-3">
                                                    {(asset.images && asset.images.length > 0 ? asset.images : (asset.image ? [asset.image] : [])).map((img, index) => (
                                                        <motion.div
                                                            key={index}
                                                            layoutId={`image-${index}`}
                                                            className={`relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50 group cursor-zoom-in ${index === 0 && (asset.images?.length || 0) % 2 !== 0 ? 'col-span-2 aspect-video' : 'aspect-square'
                                                                }`}
                                                            onClick={() => setExpandedImage(img)}
                                                        >
                                                            <img
                                                                src={img}
                                                                alt={`Asset ${index + 1}`}
                                                                className="h-full w-full object-contain p-2 transition-transform duration-500 group-hover:scale-105"
                                                            />
                                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                                                                <button className="p-2 bg-white/90 backdrop-blur rounded-full text-slate-700 shadow-sm hover:text-blue-600 transition-transform hover:scale-110 active:scale-95">
                                                                    <Maximize2 className="h-4 w-4" />
                                                                </button>
                                                            </div>
                                                        </motion.div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Hardware Specs Card */}
                                        {/* Hardware Specs Card */}
                                        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                                            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-4">
                                                <Cpu className="w-4 h-4 text-indigo-500" />
                                                Hardware Specifications
                                            </h3>
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-white rounded-lg border border-slate-100 shadow-sm">
                                                            <Cpu className="w-4 h-4 text-slate-500" />
                                                        </div>
                                                        <span className="text-sm text-slate-600">Processor</span>
                                                    </div>
                                                    <span className="text-sm font-semibold text-slate-900 truncate max-w-[150px] sm:max-w-xs text-right" title={asset.cpu || ""}>{asset.cpu || "-"}</span>
                                                </div>

                                                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-white rounded-lg border border-slate-100 shadow-sm">
                                                            <Hash className="w-4 h-4 text-slate-500" />
                                                        </div>
                                                        <span className="text-sm text-slate-600">RAM</span>
                                                    </div>
                                                    <span className="text-sm font-semibold text-slate-900">{asset.ram || "-"}</span>
                                                </div>

                                                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-white rounded-lg border border-slate-100 shadow-sm">
                                                            <HardDrive className="w-4 h-4 text-slate-500" />
                                                        </div>
                                                        <span className="text-sm text-slate-600">Storage</span>
                                                    </div>
                                                    <span className="text-sm font-semibold text-slate-900">{asset.hdd || "-"}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Column: Detailed Info */}
                                    <div className="space-y-8">

                                        {/* General Info */}
                                        <section>
                                            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide opacity-75 mb-4 border-b border-slate-100 pb-2">Identification</h3>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-4">
                                                <div className="sm:col-span-2">
                                                    <span className="text-xs font-medium text-slate-500 block mb-1">Computer Number</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono text-xl sm:text-2xl font-bold text-slate-800 tracking-tight break-all">
                                                            {asset.computerNo}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div>
                                                    <span className="text-xs font-medium text-slate-500 block mb-1">Serial Number</span>
                                                    <p className="text-sm font-mono text-slate-800 break-all">{asset.serialNo}</p>
                                                </div>
                                                <div>
                                                    <span className="text-xs font-medium text-slate-500 block mb-1">Brand & Model</span>
                                                    <p className="text-sm font-medium text-slate-800">{asset.brand || "-"} {asset.model}</p>
                                                </div>

                                                {/* Reordered: Current Owner -> Employee ID -> Assigned Department */}
                                                <div>
                                                    <span className="text-xs font-medium text-slate-500 block mb-1">Current Owner</span>
                                                    <div className="flex items-center gap-1.5">
                                                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                        <p className="text-sm text-slate-800 break-words">{asset.owner || "None"}</p>
                                                    </div>
                                                </div>

                                                {asset.empId && (
                                                    <div>
                                                        <span className="text-xs font-medium text-slate-500 block mb-1">Employee ID</span>
                                                        <p className="text-sm font-mono text-slate-800 break-all">{asset.empId}</p>
                                                    </div>
                                                )}

                                                <div>
                                                    <span className="text-xs font-medium text-slate-500 block mb-1">Assigned Department</span>
                                                    <div className="flex items-center gap-1.5">
                                                        <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                        <p className="text-sm text-slate-800">{asset.department || "Unassigned"}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </section>

                                        {/* Dates */}
                                        <section>
                                            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide opacity-75 mb-4 border-b border-slate-100 pb-2">Timeline</h3>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                                <div>
                                                    <span className="text-xs font-medium text-slate-500 block mb-1">Purchased</span>
                                                    <div className="flex items-center gap-2">
                                                        <Calendar className="w-4 h-4 text-emerald-500 shrink-0" />
                                                        <span className="text-sm text-slate-700">
                                                            {asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString(undefined, { dateStyle: 'medium' }) : "-"}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div>
                                                    <span className="text-xs font-medium text-slate-500 block mb-1">Warranty Expires</span>
                                                    <div className="flex items-center gap-2">
                                                        <Calendar className="w-4 h-4 text-amber-500 shrink-0" />
                                                        <span className="text-sm text-slate-700">
                                                            {asset.warrantyExpiry ? new Date(asset.warrantyExpiry).toLocaleDateString(undefined, { dateStyle: 'medium' }) : "-"}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div>
                                                    <span className="text-xs font-medium text-slate-500 block mb-1">Distributed</span>
                                                    <div className="flex items-center gap-2">
                                                        <Calendar className="w-4 h-4 text-blue-500 shrink-0" />
                                                        <span className="text-sm text-slate-700">
                                                            {asset.distributionDate ? new Date(asset.distributionDate).toLocaleDateString(undefined, { dateStyle: 'medium' }) : "-"}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </section>

                                        {/* Other */}
                                        <section>
                                            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide opacity-75 mb-4 border-b border-slate-100 pb-2">Metadata</h3>
                                            <div className="space-y-4">
                                                <div>
                                                    <span className="text-xs font-medium text-slate-500 block mb-2">Tags</span>
                                                    <div className="flex flex-wrap gap-2">
                                                        {asset.tags && asset.tags.length > 0 ? (
                                                            asset.tags.map((tag) => (
                                                                <span key={tag} className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 border border-slate-200">
                                                                    <Tag className="w-3 h-3" />
                                                                    {tag}
                                                                </span>
                                                            ))
                                                        ) : (
                                                            <span className="text-sm text-slate-400 italic">No tags</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div>
                                                    <span className="text-xs font-medium text-slate-500 block mb-2">Remarks</span>
                                                    <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3">
                                                        <p className="text-sm text-slate-600 leading-relaxed break-words">
                                                            {asset.remarks || <span className="italic opacity-50">No additional remarks recorded.</span>}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </section>
                                    </div>
                                </div>

                                {/* Metadata Footer in Content */}
                                <div className="mt-8 pt-6 border-t border-slate-100 flex flex-wrap justify-between gap-4 text-xs text-slate-400">
                                    <span>Last Updated: {new Date(asset.lastUpdated).toLocaleString()}</span>
                                    <span>Updated By: {asset.updatedBy}</span>
                                </div>
                            </div>

                            {/* Footer Actions */}
                            <div className="border-t border-white/20 p-4 sm:p-6 bg-white/50 backdrop-blur-md">
                                <div className="grid grid-cols-2 gap-3 sm:flex sm:justify-end">
                                    {onHistory && (
                                        <button
                                            onClick={onHistory}
                                            className="col-span-1 flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 bg-purple-600 text-white text-sm font-semibold rounded-xl shadow-sm hover:bg-purple-700 hover:shadow-md transition-all cursor-pointer active:scale-95"
                                        >
                                            <HistoryIcon className="w-4 h-4" />
                                            <span className="whitespace-nowrap">View History</span>
                                        </button>
                                    )}
                                    {onEdit && (
                                        <button
                                            onClick={onEdit}
                                            className="col-span-1 flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl shadow-sm hover:bg-blue-700 hover:shadow-md transition-all cursor-pointer active:scale-95"
                                        >
                                            <Pencil className="w-4 h-4" />
                                            <span className="whitespace-nowrap">Edit Asset</span>
                                        </button>
                                    )}
                                    <button
                                        onClick={onClose}
                                        className="col-span-2 sm:col-span-1 sm:w-auto flex items-center justify-center px-6 py-2.5 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer active:scale-95"
                                    >
                                        Close Details
                                    </button>
                                </div>
                            </div>

                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {expandedImage && (
                    <motion.div
                        key="lightbox-modal"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 p-4 backdrop-blur-sm"
                        onClick={() => setExpandedImage(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            transition={{ type: "spring", duration: 0.4 }}
                            className="relative max-w-7xl max-h-[90vh] w-full flex items-center justify-center p-4"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <img
                                src={expandedImage}
                                alt="Expanded Asset"
                                className="max-h-[85vh] w-auto h-auto object-contain rounded-lg shadow-2xl"
                            />

                            {/* Toolbar */}
                            <div className="absolute top-4 right-4 flex items-center gap-2">
                                <button
                                    onClick={() => handleDownload(expandedImage, `asset-${asset.computerNo}.png`)}
                                    className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-all active:scale-95 cursor-pointer"
                                    title="Download"
                                >
                                    <Download className="h-6 w-6" />
                                </button>
                                <button
                                    onClick={() => setExpandedImage(null)}
                                    className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-all active:scale-95 cursor-pointer"
                                    title="Close"
                                >
                                    <X className="h-6 w-6" />
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
