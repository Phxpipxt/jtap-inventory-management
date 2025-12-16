
import React, { forwardRef } from "react";
import { Asset } from "@/lib/types";

interface PrintableAssetDetailProps {
    asset: Asset;
    options: {
        showHdd: boolean;
        showRam: boolean;
        showCpu: boolean;
        showImages: boolean;
    };
}

export const PrintableAssetDetail = forwardRef<HTMLDivElement, PrintableAssetDetailProps>(
    ({ asset, options }, ref) => {
        return (
            <div ref={ref} className="p-8 print:p-8 bg-white text-black max-w-[210mm] mx-auto min-h-[297mm] border border-slate-900 print:border-black relative">
                <div className="mb-6 border-b border-black pb-4 flex justify-between items-start">
                    <div>
                        <img src="/jtekt_logo_header_v2.png" alt="Company Logo" className="h-10 object-contain mb-2" />
                        <h1 className="text-2xl font-bold uppercase tracking-tight">Asset Detail Report</h1>
                    </div>
                    <div className="text-right">
                        <div className="text-[10px] text-gray-500 uppercase">Generated on</div>
                        <div className="text-xs font-medium text-slate-900">
                            {new Date().toLocaleString()}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-x-8 gap-y-2 mb-6 ml-4">
                    <div>
                        <div className="text-[10px] font-bold uppercase text-gray-500">Computer No</div>
                        <div className="text-base font-bold">{asset.computerNo}</div>
                    </div>
                    <div>
                        <div className="text-[10px] font-bold uppercase text-gray-500">Serial No</div>
                        <div className="text-base font-bold">{asset.serialNo}</div>
                    </div>
                    <div>
                        <div className="text-[10px] font-bold uppercase text-gray-500">Brand</div>
                        <div className="text-sm">{asset.brand || "-"}</div>
                    </div>
                    <div>
                        <div className="text-[10px] font-bold uppercase text-gray-500">Model</div>
                        <div className="text-sm">{asset.model || "-"}</div>
                    </div>
                </div>

                {/* Optional Hardware Specs */}
                {(options.showHdd || options.showRam || options.showCpu) && (
                    <div className="mb-6">
                        <h2 className="text-sm font-bold border-b border-gray-300 pb-1 mb-3 uppercase tracking-wider">Hardware Specifications</h2>
                        <div className="grid grid-cols-3 gap-4">
                            {options.showHdd && (
                                <div>
                                    <div className="text-[10px] font-bold uppercase text-gray-500">HDD/SSD</div>
                                    <div className="text-sm">{asset.hdd || "-"}</div>
                                </div>
                            )}
                            {options.showRam && (
                                <div>
                                    <div className="text-[10px] font-bold uppercase text-gray-500">RAM</div>
                                    <div className="text-sm">{asset.ram || "-"}</div>
                                </div>
                            )}
                            {options.showCpu && (
                                <div>
                                    <div className="text-[10px] font-bold uppercase text-gray-500">CPU</div>
                                    <div className="text-sm">{asset.cpu || "-"}</div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Remarks */}
                <div className="mb-6 page-break-inside-avoid">
                    <h2 className="text-sm font-bold border-b border-gray-300 pb-1 mb-3 uppercase tracking-wider">Remarks</h2>
                    <div>
                        <div className="text-sm">{asset.remarks || "-"}</div>
                    </div>
                </div>

                {/* Images */}
                {options.showImages && (asset.images?.length || asset.image) && (
                    <div className="break-before-avoid">
                        <h2 className="text-sm font-bold border-b border-gray-300 pb-1 mb-3 uppercase tracking-wider">Asset Images</h2>
                        <div className="grid grid-cols-3 gap-4">
                            {(asset.images && asset.images.length > 0 ? asset.images : (asset.image ? [asset.image] : [])).map((img, idx) => (
                                <div key={idx} className="border border-gray-200 p-1 rounded bg-gray-50 flex items-center justify-center h-48">
                                    <img src={img} alt={`Asset ${idx + 1}`} className="max-w-full max-h-full object-contain" />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }
);

PrintableAssetDetail.displayName = "PrintableAssetDetail";
