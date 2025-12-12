"use client";

import { useState } from "react";
import { Asset } from "@/lib/types";
import { X, Download, Maximize2 } from "lucide-react";

interface AssetDetailModalProps {
    asset: Asset;
    isOpen: boolean;
    onClose: () => void;
}

export function AssetDetailModal({ asset, isOpen, onClose }: AssetDetailModalProps) {
    const [expandedImage, setExpandedImage] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleDownload = (imageUrl: string, fileName: string) => {
        const link = document.createElement("a");
        link.href = imageUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="flex h-full max-h-[90vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Asset Details</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="grid gap-6 md:grid-cols-2">
                        {/* Asset Images */}
                        {(asset.images?.length || asset.image) && (
                            <div className="md:col-span-2">
                                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-2">Asset Images</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                    {(asset.images && asset.images.length > 0 ? asset.images : (asset.image ? [asset.image] : [])).map((img, index) => (
                                        <div key={index} className="relative aspect-video w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-50 group">
                                            <img
                                                src={img}
                                                alt={`Asset ${index + 1}`}
                                                className="h-full w-full object-contain cursor-pointer transition-transform hover:scale-105"
                                                onClick={() => setExpandedImage(img)}
                                            />
                                            {/* Overlay Actions */}
                                            <div className="absolute inset-0 bg-black/40 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 pointer-events-none">
                                                <button
                                                    onClick={() => setExpandedImage(img)}
                                                    className="p-2 bg-white/90 rounded-full text-slate-700 hover:text-blue-600 hover:bg-white pointer-events-auto transition-colors shadow-sm"
                                                    title="Expand Image"
                                                >
                                                    <Maximize2 className="h-5 w-5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDownload(img, `asset-${asset.computerNo}-${index + 1}.png`)}
                                                    className="p-2 bg-white/90 rounded-full text-slate-700 hover:text-blue-600 hover:bg-white pointer-events-auto transition-colors shadow-sm hidden md:block"
                                                    title="Download Image"
                                                >
                                                    <Download className="h-5 w-5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Basic Info */}
                        <div className="space-y-4 md:col-span-2">
                            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Basic Information</h3>
                            <div className="grid gap-4 rounded-lg border border-slate-100 bg-slate-50 p-4 md:grid-cols-2">
                                <div>
                                    <label className="text-xs font-medium text-slate-500">Computer No.</label>
                                    <div className="font-mono text-sm font-bold text-slate-900">{asset.computerNo}</div>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-slate-500">Serial No.</label>
                                    <div className="font-mono text-sm font-medium text-slate-700">{asset.serialNo}</div>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-slate-500">Brand</label>
                                    <div className="text-sm text-slate-900">{asset.brand || "-"}</div>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-slate-500">Model</label>
                                    <div className="text-sm text-slate-900">{asset.model || "-"}</div>
                                </div>
                            </div>
                        </div>

                        {/* Status & Assignment */}
                        <div className="space-y-4 md:col-span-2">
                            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Status & Assignment</h3>
                            <div className="grid gap-4 rounded-lg border border-slate-100 bg-slate-50 p-4 md:grid-cols-2">
                                <div>
                                    <label className="text-xs font-medium text-slate-500">Status</label>
                                    <div className="mt-1">
                                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold leading-5 ${asset.status === "In Stock" ? "bg-green-100 text-green-800 border border-green-200" :
                                            asset.status === "In Use" ? "bg-blue-100 text-blue-800 border border-blue-200" :
                                                "bg-orange-100 text-orange-800 border border-orange-200"
                                            }`}>
                                            {asset.status}
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-slate-500">Distribution Date</label>
                                    <div className="text-sm font-medium text-slate-900">{asset.distributionDate ? new Date(asset.distributionDate).toLocaleDateString() : "-"}</div>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-slate-500">Owner</label>
                                    <div className="text-sm font-medium text-slate-900">{asset.owner || "-"}</div>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-slate-500">Employee ID</label>
                                    <div className="text-sm text-slate-900">{asset.empId || "-"}</div>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-slate-500">Department</label>
                                    <div className="text-sm font-medium text-slate-900">{asset.department || "-"}</div>
                                </div>
                            </div>
                        </div>

                        {/* Additional Details */}
                        <div className="space-y-4 md:col-span-2">
                            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Additional Details</h3>
                            <div className="grid gap-4 rounded-lg border border-slate-100 bg-slate-50 p-4 md:grid-cols-2">
                                <div>
                                    <label className="text-xs font-medium text-slate-500">Purchase Date</label>
                                    <div className="text-sm text-slate-900">
                                        {asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString() : "-"}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-slate-500">Warranty Expiry</label>
                                    <div className="text-sm text-slate-900">
                                        {asset.warrantyExpiry ? new Date(asset.warrantyExpiry).toLocaleDateString() : "-"}
                                    </div>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="text-xs font-medium text-slate-500">Tags</label>
                                    <div className="mt-1 flex flex-wrap gap-2">
                                        {asset.tags && asset.tags.length > 0 ? (
                                            asset.tags.map((tag) => (
                                                <span key={tag} className="inline-flex items-center rounded bg-white px-2 py-1 text-xs font-medium text-slate-700 border border-slate-200 shadow-sm">
                                                    {tag}
                                                </span>
                                            ))
                                        ) : (
                                            <span className="text-sm text-slate-400">-</span>
                                        )}
                                    </div>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="text-xs font-medium text-slate-500">Remarks</label>
                                    <div className="mt-1 rounded-md bg-white p-3 text-sm text-slate-700 border border-slate-200">
                                        {asset.remarks || <span className="text-slate-400 italic">No remarks</span>}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Hardware Specs */}
                        {(asset.hdd || asset.ram || asset.cpu) && (
                            <div className="space-y-4 md:col-span-2">
                                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Hardware Specifications</h3>
                                <div className="grid gap-4 rounded-lg border border-slate-100 bg-slate-50 p-4 md:grid-cols-3">
                                    {asset.hdd && (
                                        <div>
                                            <label className="text-xs font-medium text-slate-500">HDD/SSD</label>
                                            <div className="text-sm text-slate-900">{asset.hdd}</div>
                                        </div>
                                    )}
                                    {asset.ram && (
                                        <div>
                                            <label className="text-xs font-medium text-slate-500">RAM</label>
                                            <div className="text-sm text-slate-900">{asset.ram}</div>
                                        </div>
                                    )}
                                    {asset.cpu && (
                                        <div>
                                            <label className="text-xs font-medium text-slate-500">CPU</label>
                                            <div className="text-sm text-slate-900">{asset.cpu}</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}



                        {/* Metadata */}
                        <div className="text-xs text-slate-400 md:col-span-2 flex justify-between pt-4 border-t border-slate-100">
                            <span>Last Updated: {new Date(asset.lastUpdated).toLocaleString()}</span>
                            <span>Updated By: {asset.updatedBy}</span>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t border-slate-100 bg-slate-50 px-6 py-4">
                    <button
                        onClick={onClose}
                        className="w-full rounded-lg bg-white border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 shadow-sm cursor-pointer"
                    >
                        Close
                    </button>
                </div>
            </div>

            {/* Lightbox Modal */}
            {expandedImage && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm" onClick={() => setExpandedImage(null)}>
                    <div className="relative max-w-5xl max-h-[90vh] w-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                        <img
                            src={expandedImage}
                            alt="Expanded Asset"
                            className="max-h-[85vh] max-w-full object-contain rounded-lg shadow-2xl"
                        />
                        <button
                            onClick={() => setExpandedImage(null)}
                            className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white transition-colors"
                        >
                            <X className="h-8 w-8" />
                        </button>
                    </div>
                </div>
            )}
        </div >
    );
}
