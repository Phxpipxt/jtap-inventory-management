"use client";

import { useInventory } from "@/hooks/useInventory";
import { Asset, LogEntry } from "@/lib/types";
import { useMemo, useState } from "react";
import { Search, Filter, History, Eye, ArrowUp, ArrowDown, Upload } from "lucide-react";
import { AssetHistoryModal } from "@/components/modals/AssetHistoryModal";

export default function SecondHandPage() {
    const { assets, logs } = useInventory();
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

    // Filter assets that have 'Check-in' (Return) history, meaning they are second-hand
    const secondHandAssets = useMemo(() => {
        // Get all asset IDs that have ever been returned (Check-in)
        const returnedAssetIds = new Set(
            logs.filter(log => log.action === "Check-in").map(log => log.assetId)
        );

        return assets.filter(asset => returnedAssetIds.has(asset.id));
    }, [assets, logs]);

    const filteredAssets = useMemo(() => {
        return secondHandAssets.filter(asset =>
            asset.computerNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            asset.serialNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            asset.model?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [secondHandAssets, searchTerm]);

    const handleViewHistory = (asset: Asset) => {
        setSelectedAsset(asset);
        setIsHistoryModalOpen(true);
    };

    const handleExport = async () => {
        if (filteredAssets.length === 0) {
            alert("No assets to export.");
            return;
        }

        try {
            const XLSX = await import("xlsx");

            const data = filteredAssets.map((asset) => {
                const lastReturn = logs
                    .filter(log => log.assetId === asset.id && log.action === "Check-in")
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

                return {
                    "Computer No.": asset.computerNo,
                    "Serial No.": asset.serialNo,
                    "Brand": asset.brand || "-",
                    "Model": asset.model || "-",
                    "Status": asset.status,
                    "Last Return By": lastReturn?.details?.replace("Returned from ", "") || "-",
                    "Last Return Date": lastReturn ? new Date(lastReturn.timestamp).toLocaleDateString() : "-",
                };
            });

            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Second Hand Assets");
            XLSX.writeFile(wb, `SecondHand_Export_${new Date().toISOString().split("T")[0]}.xlsx`);
        } catch (error) {
            console.error("Export failed:", error);
            alert("Failed to export. Please try again.");
        }
    };

    return (
        <div className="space-y-6 pb-20 md:pb-0">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Second-hand Assets</h1>
                    <p className="text-sm text-slate-500">Assets that have been previously assigned and returned.</p>
                </div>
                <button
                    onClick={handleExport}
                    className="hidden md:flex items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 shadow-sm cursor-pointer"
                >
                    <Upload className="h-4 w-4" />
                    Export Report
                </button>
            </div>

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
                <button
                    onClick={handleExport}
                    className="md:hidden flex items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 shadow-sm w-full cursor-pointer"
                >
                    <Upload className="h-4 w-4" />
                    Export
                </button>
            </div>

            {/* Mobile View (Cards) */}
            <div className="grid gap-4 md:hidden">
                {filteredAssets.length === 0 ? (
                    <div className="rounded-lg bg-white p-8 text-center text-sm text-slate-500 shadow-sm border border-slate-200">
                        No second-hand assets found.
                    </div>
                ) : (
                    filteredAssets.map((asset) => {
                        const lastReturn = logs
                            .filter(log => log.assetId === asset.id && log.action === "Check-in")
                            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

                        return (
                            <div key={asset.id} className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 space-y-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="font-semibold text-slate-900">{asset.computerNo}</div>
                                        <div className="text-xs text-slate-500 mt-1">S/N : {asset.serialNo}</div>
                                        <div className="text-xs text-slate-500">Model : {asset.brand} {asset.model}</div>
                                    </div>
                                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold leading-5 ${asset.status === "In Stock" ? "bg-green-100 text-green-800" :
                                        asset.status === "In Use" ? "bg-blue-100 text-blue-800" :
                                            "bg-slate-100 text-slate-800"
                                        }`}>
                                        {asset.status}
                                    </span>
                                </div>

                                <div className="border-t border-slate-100 pt-3">
                                    <p className="text-xs font-semibold text-slate-500 mb-1">Last Return</p>
                                    {lastReturn ? (
                                        <div className="flex flex-col">
                                            <span className="text-slate-900 text-sm font-medium" >
                                                {lastReturn.details?.replace("Returned from ", "") || "Unknown"}
                                            </span>
                                            <span className="text-xs text-slate-500">{new Date(lastReturn.timestamp).toLocaleDateString()}</span>
                                        </div>
                                    ) : (
                                        <span className="text-sm text-slate-400">-</span>
                                    )}
                                </div>

                                <button
                                    onClick={() => handleViewHistory(asset)}
                                    className="w-full flex items-center justify-center gap-2 rounded-md bg-slate-100 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                                    title="View usage history"
                                >
                                    <History className="h-4 w-4" />
                                    View History
                                </button>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Desktop View (Table) */}
            <div className="hidden md:block overflow-hidden rounded-lg border border-slate-200 bg-white shadow-md">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Asset Info</th>
                                <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Current Status</th>
                                <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Last Return</th>
                                <th className="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-500"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                            {filteredAssets.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-sm text-slate-500">
                                        No second-hand assets found.
                                    </td>
                                </tr>
                            ) : (
                                filteredAssets.map((asset) => {
                                    // Find last return log
                                    const lastReturn = logs
                                        .filter(log => log.assetId === asset.id && log.action === "Check-in")
                                        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

                                    return (
                                        <tr key={asset.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="whitespace-nowrap px-6 py-4">
                                                <div className="flex items-center">
                                                    <div>
                                                        <div className="font-semibold text-slate-900">{asset.computerNo}</div>
                                                        <div className="text-xs text-slate-500">S/N : {asset.serialNo}</div>
                                                        <div className="text-xs text-slate-500">{asset.brand} {asset.model}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="whitespace-nowrap px-6 py-4">
                                                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold leading-5 ${asset.status === "In Stock" ? "bg-green-100 text-green-800" :
                                                    asset.status === "In Use" ? "bg-blue-100 text-blue-800" :
                                                        "bg-slate-100 text-slate-800"
                                                    }`}>
                                                    {asset.status}
                                                </span>
                                            </td>
                                            <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                                                {lastReturn ? (
                                                    <div className="flex flex-col">
                                                        <span className="text-slate-900 font-medium whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px]" title={lastReturn.details}>
                                                            {lastReturn.details?.replace("Returned from ", "") || "Unknown"}
                                                        </span>
                                                        <span className="text-xs">{new Date(lastReturn.timestamp).toLocaleDateString()}</span>
                                                    </div>
                                                ) : "-"}
                                            </td>
                                            <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                                                <button
                                                    onClick={() => handleViewHistory(asset)}
                                                    className="inline-flex items-center gap-1 rounded bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                                                    title="View usage history"
                                                >
                                                    <History className="h-3.5 w-3.5" />
                                                    View History
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
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
        </div>
    );
}
