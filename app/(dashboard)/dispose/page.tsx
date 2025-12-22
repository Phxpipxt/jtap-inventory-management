"use client";

import { useInventory } from "@/hooks/useInventory";
import { Asset } from "@/lib/types";
import { useMemo, useState, Suspense } from "react";
import { AssetHistoryModal } from "@/components/modals/AssetHistoryModal";
import { AssetDetailModal } from "@/components/modals/AssetDetailModal";
import { AlertModal } from "@/components/modals/AlertModal";
import { ExportOptionsModal } from "@/components/modals/ExportOptionsModal";
import { Eye, Search, History, Upload, Trash2, AlertTriangle, CheckSquare, Square, X, CheckCircle2, Download, RotateCcw } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { useSearchParams } from "next/navigation";
import { TableSkeleton } from "@/components/skeletons/AppSkeletons";
import { motion } from "framer-motion";



function DisposeContent() {
    const { assets, logs, updateAsset, loading } = useInventory(); // Ensure updateAsset is available
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const initialTab = searchParams.get("tab");

    const [searchTerm, setSearchTerm] = useState("");
    const [activeTab, setActiveTab] = useState<"candidates" | "disposed">(initialTab === "disposed" ? "disposed" : "candidates");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);

    // Export Modal State
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [exportAsset, setExportAsset] = useState<Asset | null>(null);

    const [recentlyDisposedAssets, setRecentlyDisposedAssets] = useState<Asset[] | null>(null);
    const [targetDisposeIds, setTargetDisposeIds] = useState<Set<string> | null>(null);
    const [confirmModalOpen, setConfirmModalOpen] = useState(false);

    // Restore Confirmation State
    const [isRestoreConfirmOpen, setIsRestoreConfirmOpen] = useState(false);
    const [restoreAssetCandidate, setRestoreAssetCandidate] = useState<Asset | null>(null);
    const [restoreReason, setRestoreReason] = useState("");

    // Initiate bulk dispose
    const handleBulkDisposeClick = () => {
        setTargetDisposeIds(selectedIds);
        setConfirmModalOpen(true);
    };

    // Initiate single dispose
    const handleSingleDisposeClick = (id: string) => {
        setTargetDisposeIds(new Set([id]));
        setConfirmModalOpen(true);
    };

    const handleRestoreClick = (asset: Asset) => {
        setRestoreAssetCandidate(asset);
        setRestoreReason("");
        setIsRestoreConfirmOpen(true);
    };

    const confirmRestore = async () => {
        if (!restoreAssetCandidate) return;
        if (!restoreReason.trim()) {
            showAlert("Error", "Please provide a reason for restoration", "error");
            return;
        }

        const updatedAsset: Asset = {
            ...restoreAssetCandidate,
            status: "In Stock",
            updatedBy: user?.name || "admin",
            lastUpdated: new Date().toISOString(),
        };
        await updateAsset(updatedAsset, user?.name || "admin", "Update", `Restored: ${restoreReason}`);

        setIsRestoreConfirmOpen(false);
        setRestoreAssetCandidate(null);
        setRestoreReason("");

        showAlert("Restored", `Asset ${restoreAssetCandidate.computerNo} has been restored to stock.`, "success");
    };

    const [alertState, setAlertState] = useState<{ isOpen: boolean; title: string; message: string | React.ReactNode; type: "default" | "error" | "warning" | "success" }>({
        isOpen: false,
        title: "",
        message: "",
        type: "default",
    });

    const showAlert = (title: string, message: string | React.ReactNode, type: "default" | "error" | "warning" | "success" = "default") => {
        setAlertState({ isOpen: true, title, message, type });
    };

    // Filter assets for disposal candidates: > 5 years old AND In Stock
    const candidateAssets = useMemo(() => {
        const now = new Date();
        const fiveYearsAgo = new Date(now.getFullYear() - 5, now.getMonth(), now.getDate());

        return assets.filter(asset => {
            if (asset.status !== "In Stock") return false;
            if (!asset.purchaseDate) return false;

            const purchaseDate = new Date(asset.purchaseDate);
            return purchaseDate <= fiveYearsAgo;
        });
    }, [assets]);

    // Filter disposed assets
    const disposedAssets = useMemo(() => {
        return assets.filter(asset => asset.status === "Disposed");
    }, [assets]);

    const filteredAssets = useMemo(() => {
        const sourceList = activeTab === "candidates" ? candidateAssets : disposedAssets;
        return sourceList.filter(asset =>
            asset.computerNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            asset.serialNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            asset.model?.toLowerCase().includes(searchTerm.toLowerCase())
        ).sort((a, b) => a.computerNo.localeCompare(b.computerNo));
    }, [activeTab, candidateAssets, disposedAssets, searchTerm]);

    const calculateAge = (purchaseDateStr?: string) => {
        if (!purchaseDateStr) return "N/A";
        const purchaseDate = new Date(purchaseDateStr);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - purchaseDate.getTime());
        const diffYears = (diffTime / (1000 * 60 * 60 * 24 * 365.25)).toFixed(1);
        return `${diffYears} Years`;
    };

    const handleSelectAll = () => {
        if (selectedIds.size === filteredAssets.length) {
            setSelectedIds(new Set());
        } else {
            const newSelected = new Set(filteredAssets.map(a => a.id));
            setSelectedIds(newSelected);
        }
    };

    const handleSelectRow = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };



    const confirmDispose = async () => {
        if (!user || !targetDisposeIds) return;

        const assetsToDispose = assets.filter(a => targetDisposeIds.has(a.id));

        // Process serially
        for (const asset of assetsToDispose) {
            await updateAsset(
                { ...asset, status: "Disposed" },
                user.name,
                "Dispose",
                "Asset Disposed"
            );
        }

        // Update selection logic
        if (targetDisposeIds === selectedIds) {
            setSelectedIds(new Set());
        }
        else {
            const newSelected = new Set(selectedIds);
            for (const id of targetDisposeIds) {
                newSelected.delete(id);
            }
            setSelectedIds(newSelected);
        }

        setTargetDisposeIds(null);
        setConfirmModalOpen(false);

        // Show custom success modal with the list
        setRecentlyDisposedAssets(assetsToDispose);
        setActiveTab("disposed");
    };

    const handleExport = async () => {
        if (filteredAssets.length === 0) {
            showAlert("Export Failed", "No assets to export.", "warning");
            return;
        }

        try {
            const XLSX = await import("xlsx");
            const data = filteredAssets.map((asset) => {
                const baseData = {
                    "Computer No.": asset.computerNo,
                    "Serial No.": asset.serialNo,
                    "Brand": asset.brand || "-",
                    "Model": asset.model || "-",
                    "Status": asset.status,
                    "Age": calculateAge(asset.purchaseDate),
                    "Purchase Date": asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString() : "-",
                };

                if (activeTab === "disposed") {
                    // Find the last "In Use" context from logs
                    const assetLogs = logs.filter(l => l.assetId === asset.id).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

                    let lastUsedBy = "-";
                    let lastEmpId = "-";

                    // Look for the most recent relevant log
                    const lastUsageLog = assetLogs.find(l =>
                        l.action === "Check-in" || l.action === "Check-out"
                    );

                    if (lastUsageLog) {
                        const details = lastUsageLog.details || "";
                        if (lastUsageLog.action === "Check-out" && details.startsWith("Assigned to")) {
                            const nameMatch = details.match(/Assigned to (.*?)\s+\(/);
                            if (nameMatch) lastUsedBy = nameMatch[1];
                            const idMatch = details.match(/ID: (.*?),/);
                            if (idMatch) lastEmpId = idMatch[1];
                        } else if (lastUsageLog.action === "Check-in" && details.startsWith("Returned from")) {
                            const namePart = details.split(" (Distributed:")[0];
                            const nameMatch = namePart.replace("Returned from ", "");
                            lastUsedBy = nameMatch;
                        }
                    }
                    if (lastUsedBy === "-" && asset.owner) lastUsedBy = asset.owner;
                    if (lastEmpId === "-" && asset.empId) lastEmpId = asset.empId;

                    return {
                        ...baseData,
                        "Disposed Date": new Date(asset.lastUpdated).toLocaleDateString(),
                        "Last Used By": lastUsedBy,
                        "Last Emp ID": lastEmpId
                    };
                } else {
                    // Candidates
                    return {
                        ...baseData,
                        "Current Location": "In Stock",
                    };
                }
            });

            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            const sheetName = activeTab === "disposed" ? "Disposed Assets" : "Dispose Candidates";
            const fileName = activeTab === "disposed" ? "Disposed_Assets" : "Dispose_Candidates";

            XLSX.utils.book_append_sheet(wb, ws, sheetName);
            XLSX.writeFile(wb, `${fileName}_${new Date().toISOString().split("T")[0]}.xlsx`);
        } catch (error) {
            console.error(error);
            showAlert("Error", "Failed to export data", "error");
        }
    };

    const handleViewHistory = (asset: Asset) => {
        setSelectedAsset(asset);
        setIsHistoryModalOpen(true);
    };

    const handleViewDetails = (asset: Asset) => {
        setSelectedAsset(asset);
        setIsViewModalOpen(true);
    };

    const handleOpenExport = (asset: Asset) => {
        setExportAsset(asset);
        setIsExportModalOpen(true);
    };


    if (loading) return <TableSkeleton />;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6 pb-20 md:pb-0 font-inter"
        >
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Asset Disposal</h1>
                    <p className="text-sm text-slate-500">Manage assets eligible for disposal and view disposal history.</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex p-1 bg-slate-100 rounded-lg w-full md:w-auto self-start md:inline-flex">
                <button
                    onClick={() => { setActiveTab("candidates"); setSearchTerm(""); setSelectedIds(new Set()); }}
                    className={`flex-1 md:flex-none px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 cursor-pointer ${activeTab === "candidates"
                        ? "bg-white text-blue-700 shadow-sm ring-1 ring-black/5"
                        : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                        }`}
                >
                    Dispose Candidates
                    <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-semibold ${activeTab === "candidates" ? "bg-blue-100 text-blue-800" : "bg-slate-200 text-slate-600"}`}>
                        {candidateAssets.length}
                    </span>
                </button>
                <button
                    onClick={() => { setActiveTab("disposed"); setSearchTerm(""); setSelectedIds(new Set()); }}
                    className={`flex-1 md:flex-none px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 cursor-pointer ${activeTab === "disposed"
                        ? "bg-white text-red-700 shadow-sm ring-1 ring-black/5"
                        : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                        }`}
                >
                    Disposed Assets
                    <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-semibold ${activeTab === "disposed" ? "bg-red-100 text-red-800" : "bg-slate-200 text-slate-600"}`}>
                        {disposedAssets.length}
                    </span>
                </button>
            </div>

            {/* Actions Bar */}
            <div className="flex flex-col gap-3 rounded-lg bg-white p-4 shadow-md border border-slate-100 md:flex-row md:gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search computer no, serial..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full rounded-md border border-slate-300 pl-10 pr-4 py-2 text-black placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                </div>

                {activeTab === "candidates" && selectedIds.size > 0 && (
                    <button
                        onClick={handleBulkDisposeClick}
                        className="group flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-pink-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-red-500/20 transition-all hover:shadow-red-500/40 hover:scale-[1.02] active:scale-[0.98] animate-in fade-in"
                    >
                        <Trash2 className="h-4 w-4 transition-transform group-hover:rotate-12" />
                        <span>Dispose Selected ({selectedIds.size})</span>
                    </button>
                )}

                {(activeTab === "candidates" || activeTab === "disposed") && (
                    <button
                        onClick={handleExport}
                        className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition-all hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                    >
                        <Upload className="h-4 w-4" />
                        Export Report
                    </button>
                )}
            </div>

            {/* Table View */}
            <div className="hidden md:block overflow-hidden rounded-lg border border-slate-200 bg-white shadow-md">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                {activeTab === "candidates" && (
                                    <th className="px-6 py-3 text-left" style={{ width: "50px" }}>
                                        <input
                                            type="checkbox"
                                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                            checked={filteredAssets.length > 0 && selectedIds.size === filteredAssets.length}
                                            onChange={handleSelectAll}
                                        />
                                    </th>
                                )}
                                <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Asset Info</th>
                                <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Age</th>
                                <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-500">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                            {filteredAssets.length === 0 ? (
                                <tr>
                                    <td colSpan={activeTab === "candidates" ? 5 : 4} className="px-6 py-8 text-center text-sm text-slate-500">
                                        No assets found.
                                    </td>
                                </tr>
                            ) : (
                                filteredAssets.map((asset) => (
                                    <tr key={asset.id} className={`hover:bg-slate-50 transition-colors ${selectedIds.has(asset.id) ? "bg-blue-50" : ""}`}>
                                        {activeTab === "candidates" && (
                                            <td className="px-6 py-4">
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                    checked={selectedIds.has(asset.id)}
                                                    onChange={() => handleSelectRow(asset.id)}
                                                />
                                            </td>
                                        )}
                                        <td className="whitespace-nowrap px-6 py-4">
                                            <div className="flex items-center">
                                                <div>
                                                    <div className="font-semibold text-slate-900">{asset.computerNo}</div>
                                                    <div className="text-xs text-slate-500">S/N: {asset.serialNo}</div>
                                                    <div className="text-xs text-slate-500">{asset.brand} {asset.model}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-700">
                                            {calculateAge(asset.purchaseDate)}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4">
                                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold leading-5 ${asset.status === "Disposed"
                                                ? "bg-slate-600 text-white"
                                                : "bg-red-100 text-red-800"
                                                }`}>
                                                {asset.status === "In Stock" ? "Can Dispose" : asset.status}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                                            <div className="flex items-center justify-end gap-2">
                                                {activeTab === "disposed" && (
                                                    <button
                                                        onClick={() => handleRestoreClick(asset)}
                                                        className="inline-flex items-center gap-1 rounded bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer"
                                                        title="Restore to Stock"
                                                    >
                                                        <RotateCcw className="h-3.5 w-3.5" />
                                                        Restore
                                                    </button>
                                                )}
                                                {activeTab === "candidates" && (
                                                    <button
                                                        onClick={() => handleSingleDisposeClick(asset.id)}
                                                        className="inline-flex items-center gap-1 rounded bg-red-50 text-red-700 px-3 py-1.5 text-xs font-medium hover:bg-red-100 transition-colors cursor-pointer"
                                                        title="Dispose this item"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                        Dispose
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleViewDetails(asset)}
                                                    className="inline-flex items-center gap-1 rounded bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer"
                                                    title="View details"
                                                >
                                                    <Eye className="h-3.5 w-3.5" />
                                                    Details
                                                </button>
                                                <button
                                                    onClick={() => handleViewHistory(asset)}
                                                    className="inline-flex items-center gap-1 rounded bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                                                    title="View usage history"
                                                >
                                                    <History className="h-3.5 w-3.5" />
                                                    History
                                                </button>
                                                <button
                                                    onClick={() => handleOpenExport(asset)}
                                                    className="inline-flex items-center gap-1 rounded bg-white border border-slate-200 px-2 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                                                    title="Export Options"
                                                >
                                                    <Upload className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mobile View (Cards) */}
            <div className="grid gap-4 md:hidden">
                {activeTab === "candidates" && filteredAssets.length > 0 && (
                    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 shadow-sm">
                        <input
                            type="checkbox"
                            checked={selectedIds.size === filteredAssets.length}
                            onChange={handleSelectAll}
                            className="h-5 w-5 rounded border-slate-300 text-blue-600"
                        />
                        <span className="text-sm font-medium text-slate-700">Select All</span>
                    </div>
                )}

                {filteredAssets.length === 0 ? (
                    <div className="rounded-lg bg-white p-8 text-center text-sm text-slate-500 border border-slate-200">
                        No assets found.
                    </div>
                ) : (
                    filteredAssets.map((asset) => (
                        <div key={asset.id} className={`bg-white p-4 rounded-lg shadow-sm border space-y-3 ${selectedIds.has(asset.id) ? "border-blue-300 bg-blue-50" : "border-slate-200"}`}>
                            <div className="flex justify-between items-start">
                                <div className="flex gap-3">
                                    {activeTab === "candidates" && (
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.has(asset.id)}
                                            onChange={() => handleSelectRow(asset.id)}
                                            className="mt-1 h-5 w-5 rounded border-slate-300 text-blue-600"
                                        />
                                    )}
                                    <div>
                                        <div className="font-semibold text-slate-900">{asset.computerNo}</div>
                                        <div className="text-xs text-slate-500 mt-1">S/N: {asset.serialNo}</div>
                                        <div className="text-xs text-slate-500">{asset.brand} {asset.model}</div>
                                    </div>
                                </div>
                                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold leading-5 ${asset.status === "Disposed"
                                    ? "bg-slate-600 text-white"
                                    : "bg-red-100 text-red-800"
                                    }`}>
                                    {asset.status === "In Stock" ? "Can Dispose" : asset.status}
                                </span>
                            </div>

                            <div className="border-t border-slate-100 pt-3 flex flex-col gap-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-semibold text-slate-500">Age</p>
                                        <p className="text-sm font-medium text-slate-900">{calculateAge(asset.purchaseDate)}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-4 gap-2">
                                    {activeTab === "disposed" && (
                                        <div className="col-span-4">
                                            <button
                                                onClick={() => handleRestoreClick(asset)}
                                                className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-50 py-2.5 text-sm font-bold text-emerald-700 hover:bg-emerald-100 transition-colors border border-emerald-100"
                                            >
                                                <RotateCcw className="h-4 w-4" />
                                                Restore Asset
                                            </button>
                                        </div>
                                    )}
                                    {activeTab === "candidates" && (
                                        <div className="col-span-4">
                                            <button
                                                onClick={() => handleSingleDisposeClick(asset.id)}
                                                className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-50 py-2.5 text-sm font-bold text-red-700 hover:bg-red-100 transition-colors border border-red-100"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                                Dispose Asset
                                            </button>
                                        </div>
                                    )}
                                    <button
                                        onClick={() => handleViewDetails(asset)}
                                        className="col-span-2 flex items-center justify-center gap-2 rounded-lg bg-blue-50 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors border border-blue-100"
                                    >
                                        <Eye className="h-3.5 w-3.5" />
                                        Details
                                    </button>
                                    <button
                                        onClick={() => handleViewHistory(asset)}
                                        className="col-span-1 flex items-center justify-center rounded-lg bg-slate-50 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors border border-slate-200"
                                        title="View History"
                                    >
                                        <History className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => handleOpenExport(asset)}
                                        className="col-span-1 flex items-center justify-center rounded-lg bg-white border border-slate-200 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                                        title="Export"
                                    >
                                        <Upload className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {selectedAsset && (
                <AssetHistoryModal
                    asset={selectedAsset}
                    isOpen={isHistoryModalOpen}
                    onClose={() => {
                        setIsHistoryModalOpen(false);
                        setSelectedAsset(null);
                    }}
                />
            )}

            {selectedAsset && (
                <AssetDetailModal
                    asset={selectedAsset}
                    isOpen={isViewModalOpen}
                    onClose={() => {
                        setIsViewModalOpen(false);
                        setSelectedAsset(null);
                    }}
                />
            )}

            {isExportModalOpen && exportAsset && (
                <ExportOptionsModal
                    asset={exportAsset}
                    isOpen={isExportModalOpen}
                    onClose={() => {
                        setIsExportModalOpen(false);
                        setExportAsset(null);
                    }}
                />
            )}

            <AlertModal
                isOpen={alertState.isOpen}
                onClose={() => setAlertState({ ...alertState, isOpen: false })}
                title={alertState.title}
                message={alertState.message}
                type={alertState.type}
            />

            {/* Confirmation Modal */}
            {confirmModalOpen && targetDisposeIds && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl max-h-[90vh] flex flex-col">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-slate-900">Confirm Disposal</h2>
                            <button onClick={() => setConfirmModalOpen(false)} className="text-slate-500 hover:text-slate-700 cursor-pointer">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <p className="mb-4 text-sm text-slate-600">
                            Are you sure you want to dispose the following <span className="font-bold text-slate-900">{targetDisposeIds.size}</span> asset(s)? This action will move them to the Disposed list.
                        </p>

                        <div className="mb-6 flex-1 overflow-y-auto rounded-md border border-slate-200 bg-slate-50 p-3 max-h-[300px]">
                            <ul className="space-y-2">
                                {assets.filter(a => targetDisposeIds.has(a.id)).map(asset => (
                                    <li key={asset.id} className="flex flex-col border-b border-slate-200 pb-2 last:border-0 last:pb-0">
                                        <span className="font-semibold text-slate-900">{asset.computerNo}</span>
                                        <span className="text-xs text-slate-500">Serial: {asset.serialNo}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setConfirmModalOpen(false)}
                                className="rounded-md border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDispose}
                                className="rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700 transition-colors shadow-sm"
                            >
                                Dispose
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Success Modal */}
            {recentlyDisposedAssets && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl max-h-[90vh] flex flex-col">
                        <div className="mb-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-6 w-6 text-green-600" />
                                <h2 className="text-xl font-bold text-slate-900">Disposal Complete</h2>
                            </div>
                            <button onClick={() => setRecentlyDisposedAssets(null)} className="text-slate-500 hover:text-slate-700 cursor-pointer">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <p className="mb-4 text-sm text-slate-600">
                            Successfully disposed <span className="font-bold text-slate-900">{recentlyDisposedAssets.length}</span> asset(s).
                        </p>

                        <div className="mb-6 flex-1 overflow-y-auto rounded-md border border-slate-200 bg-slate-50 p-3 max-h-[300px]">
                            <ul className="space-y-2">
                                {recentlyDisposedAssets.map(asset => (
                                    <li key={asset.id} className="flex flex-col border-b border-slate-200 pb-2 last:border-0 last:pb-0">
                                        <span className="font-semibold text-slate-900">{asset.computerNo}</span>
                                        <span className="text-xs text-slate-500">Serial: {asset.serialNo}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="flex justify-end">
                            <button
                                onClick={() => setRecentlyDisposedAssets(null)}
                                className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition-colors shadow-sm"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Restore Confirmation Modal */}
            {isRestoreConfirmOpen && restoreAssetCandidate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
                        <div className="mb-4 flex items-center gap-2 text-slate-900 border-b border-slate-100 pb-3">
                            <AlertTriangle className="h-6 w-6 text-orange-500" />
                            <h2 className="text-lg font-bold">Confirm Restore</h2>
                        </div>

                        <div className="mb-6 space-y-4">
                            <p className="text-slate-600">
                                Are you sure you want to restore this asset to stock?
                            </p>
                            <div className="flex flex-col items-center justify-center rounded-lg bg-slate-50 p-4 border border-slate-200">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Computer No.</span>
                                <span className="text-2xl font-bold text-slate-900 tracking-tight">{restoreAssetCandidate.computerNo}</span>
                                <span className="text-sm text-slate-500 mt-1">{restoreAssetCandidate.brand} {restoreAssetCandidate.model}</span>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Reason for Restoration <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={restoreReason}
                                    onChange={(e) => setRestoreReason(e.target.value)}
                                    placeholder="e.g., Repaired and ready for use, Mistakenly disposed..."
                                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    rows={3}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    setIsRestoreConfirmOpen(false);
                                    setRestoreAssetCandidate(null);
                                }}
                                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50 transition-colors font-medium cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmRestore}
                                className="rounded-md bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 transition-colors shadow-sm font-medium flex items-center gap-2 cursor-pointer"
                            >
                                <RotateCcw className="h-4 w-4" />
                                Confirm Restore
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </motion.div>
    );
}

export default function DisposePage() {
    return (
        <Suspense fallback={<TableSkeleton />}>
            <DisposeContent />
        </Suspense>
    );
}
