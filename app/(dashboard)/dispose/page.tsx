"use client";

import { useInventory } from "@/hooks/useInventory";
import { Asset } from "@/lib/types";
import { useMemo, useState } from "react";
import { Search, History } from "lucide-react";
import { AssetHistoryModal } from "@/components/modals/AssetHistoryModal";

export default function DisposePage() {
    const { assets } = useInventory();
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

    // Filter assets for disposal: > 5 years old AND In Stock
    const disposeAssets = useMemo(() => {
        const now = new Date();
        const fiveYearsAgo = new Date(now.getFullYear() - 5, now.getMonth(), now.getDate());

        return assets.filter(asset => {
            if (asset.status !== "In Stock") return false;
            if (!asset.purchaseDate) return false;

            const purchaseDate = new Date(asset.purchaseDate);
            return purchaseDate <= fiveYearsAgo;
        });
    }, [assets]);

    const filteredAssets = useMemo(() => {
        return disposeAssets.filter(asset =>
            asset.computerNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            asset.serialNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            asset.model?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [disposeAssets, searchTerm]);

    const handleViewHistory = (asset: Asset) => {
        setSelectedAsset(asset);
        setIsHistoryModalOpen(true);
    };

    const calculateAge = (purchaseDateStr?: string) => {
        if (!purchaseDateStr) return "N/A";
        const purchaseDate = new Date(purchaseDateStr);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - purchaseDate.getTime());
        const diffYears = (diffTime / (1000 * 60 * 60 * 24 * 365.25)).toFixed(1);
        return `${diffYears} Years`;
    };

    return (
        <div className="space-y-6 pb-20 md:pb-0">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Dispose Candidates</h1>
                    <p className="text-sm text-slate-500">Assets older than 5 years that have been returned (In Stock).</p>
                </div>
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
            </div>

            {/* Mobile View (Cards) */}
            <div className="grid gap-4 md:hidden">
                {filteredAssets.length === 0 ? (
                    <div className="rounded-lg bg-white p-8 text-center text-sm text-slate-500 shadow-sm border border-slate-200">
                        No assets found for disposal.
                    </div>
                ) : (
                    filteredAssets.map((asset) => (
                        <div key={asset.id} className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 space-y-3">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="font-semibold text-slate-900">{asset.computerNo}</div>
                                    <div className="text-xs text-slate-500 mt-1">S/N : {asset.serialNo}</div>
                                    <div className="text-xs text-slate-500">Model : {asset.brand} {asset.model}</div>
                                </div>
                                <span className="inline-flex rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold leading-5 text-red-800">
                                    Can Dispose
                                </span>
                            </div>

                            <div className="border-t border-slate-100 pt-3 flex justify-between items-center">
                                <div>
                                    <p className="text-xs font-semibold text-slate-500">Age</p>
                                    <p className="text-sm font-medium text-slate-900">{calculateAge(asset.purchaseDate)}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-slate-500">Status</p>
                                    <p className="text-sm font-medium text-slate-900">{asset.status}</p>
                                </div>
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
                    ))
                )}
            </div>

            {/* Desktop View (Table) */}
            <div className="hidden md:block overflow-hidden rounded-lg border border-slate-200 bg-white shadow-md">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Asset Info</th>
                                <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Age</th>
                                <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-500"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                            {filteredAssets.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-sm text-slate-500">
                                        No assets found for disposal.
                                    </td>
                                </tr>
                            ) : (
                                filteredAssets.map((asset) => (
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
                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-700">
                                            {calculateAge(asset.purchaseDate)}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4">
                                            <div className="flex gap-2">
                                                <span className="inline-flex rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-bold leading-5 text-green-800">
                                                    {asset.status}
                                                </span>
                                                <span className="inline-flex rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold leading-5 text-red-800">
                                                    Can Dispose
                                                </span>
                                            </div>
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
                                ))
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
