
"use client";

import { useState, useRef } from "react";
import { Asset } from "@/lib/types";
import { X, Printer, Download } from "lucide-react";
import { useReactToPrint } from "react-to-print";
import { PrintableAssetDetail } from "@/components/PrintableAssetDetail";

interface ExportOptionsModalProps {
    asset: Asset | null;
    isOpen: boolean;
    onClose: () => void;
}

export function ExportOptionsModal({ asset, isOpen, onClose }: ExportOptionsModalProps) {
    const [options, setOptions] = useState({
        showHdd: true,
        showRam: true,
        showCpu: true,
        showImages: true,
    });

    const printRef = useRef<HTMLDivElement>(null);

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: asset ? `Asset_Detail_${asset.computerNo}` : "Asset_Detail",
    });



    if (!isOpen || !asset) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                    <h2 className="text-lg font-bold text-slate-900">Export Options</h2>
                    <button onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <p className="text-sm text-slate-600">Select details to include in the export/print:</p>

                    <div className="space-y-3">
                        <label className="flex items-center space-x-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={options.showHdd}
                                onChange={(e) => setOptions({ ...options, showHdd: e.target.checked })}
                                className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-slate-700 font-medium">HDD / SSD</span>
                        </label>
                        <label className="flex items-center space-x-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={options.showRam}
                                onChange={(e) => setOptions({ ...options, showRam: e.target.checked })}
                                className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-slate-700 font-medium">RAM Type/Size</span>
                        </label>
                        <label className="flex items-center space-x-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={options.showCpu}
                                onChange={(e) => setOptions({ ...options, showCpu: e.target.checked })}
                                className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-slate-700 font-medium">CPU Model</span>
                        </label>
                        <label className="flex items-center space-x-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={options.showImages}
                                onChange={(e) => setOptions({ ...options, showImages: e.target.checked })}
                                className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-slate-700 font-medium">Asset Images</span>
                        </label>
                    </div>
                </div>

                <div className="border-t border-slate-100 bg-slate-50 px-6 py-4 flex gap-3">
                    <button
                        onClick={handlePrint}
                        className="hidden md:flex flex-1 items-center justify-center gap-2 rounded-lg bg-white border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 shadow-sm transition-colors cursor-pointer"
                    >
                        <Printer className="h-4 w-4" />
                        Print
                    </button>
                    <button
                        onClick={handlePrint}
                        className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 shadow-sm transition-colors cursor-pointer"
                    >
                        <Download className="h-4 w-4" />
                        Download PDF
                    </button>
                </div>
            </div>

            {/* Hidden Printable Component */}
            <div className="hidden">
                <PrintableAssetDetail
                    ref={printRef}
                    asset={asset}
                    options={options}
                />
            </div>
        </div>
    );
}
