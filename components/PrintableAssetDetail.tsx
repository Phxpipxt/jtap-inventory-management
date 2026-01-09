
import React, { forwardRef } from "react";
import { Asset } from "@/lib/types";

interface PrintableAssetDetailProps {
    asset: Asset;
    options: {
        showCondition: boolean;
        showHdd: boolean;
        showRam: boolean;
        showCpu: boolean;
        showImages: boolean;
    };
}

export const PrintableAssetDetail = forwardRef<HTMLDivElement, PrintableAssetDetailProps>(
    ({ asset, options }, ref) => {
        const isWorking = asset.condition === "Working";
        // Explicit HEX colors for html2canvas compatibility
        // User requested text only: Bold Green for Working, Bold Red for Not Working
        const statusStyle = isWorking
            ? { color: "#16a34a" } // Green-600
            : { color: "#dc2626" }; // Red-600

        return (
            <div
                ref={ref}
                className="p-8 print:p-8 w-[210mm] mx-auto min-h-[296mm] print:min-h-0 print:h-auto border relative box-border print:border-none"
                style={{ backgroundColor: "#ffffff", color: "#000000", borderColor: "#0f172a" }}
            >
                <div className="mb-6 pb-4 flex justify-between items-start border-b" style={{ borderColor: "#000000" }}>
                    <div>
                        <img src="/jtekt_logo.png" alt="Company Logo" className="h-10 object-contain mb-2" />
                        <h1 className="text-2xl font-bold uppercase tracking-tight">Asset Detail Report</h1>
                    </div>
                    <div className="text-right">
                        <div className="text-[10px] uppercase" style={{ color: "#6b7280" }}>Generated on</div>
                        <div className="text-xs font-medium" style={{ color: "#0f172a" }}>
                            {new Date().toLocaleString()}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-x-8 gap-y-2 mb-6 ml-4">
                    <div>
                        <div className="text-[10px] font-bold uppercase" style={{ color: "#6b7280" }}>Computer No</div>
                        <div className="text-base font-bold">{asset.computerNo}</div>
                    </div>
                    <div>
                        <div className="text-[10px] font-bold uppercase" style={{ color: "#6b7280" }}>Serial No</div>
                        <div className="text-base font-bold">{asset.serialNo}</div>
                    </div>
                    <div>
                        <div className="text-[10px] font-bold uppercase" style={{ color: "#6b7280" }}>Brand</div>
                        <div className="text-sm">{asset.brand || "-"}</div>
                    </div>
                    <div>
                        <div className="text-[10px] font-bold uppercase" style={{ color: "#6b7280" }}>Model</div>
                        <div className="text-sm">{asset.model || "-"}</div>
                    </div>
                    {/* Condition Status Badge */}
                    {options.showCondition && (
                        <div className="col-span-2 mt-2">
                            <div className="text-[10px] font-bold uppercase mb-1" style={{ color: "#6b7280" }}>Condition</div>
                            <span
                                className="text-sm font-bold"
                                style={statusStyle}
                            >
                                {asset.condition || "Unknown"}
                                {asset.condition === "Not Working" && asset.issues && (
                                    <span style={{ color: "#374151", fontWeight: "normal", marginLeft: "8px", fontSize: "12px" }}>
                                        {` - ${asset.issues}`}
                                    </span>
                                )}
                            </span>
                        </div>
                    )}
                </div>

                {/* Optional Hardware Specs */}
                {(options.showHdd || options.showRam || options.showCpu) && (
                    <div className="mb-6">
                        <h2 className="text-sm font-bold border-b pb-1 mb-3 uppercase tracking-wider" style={{ borderColor: "#d1d5db" }}>Hardware Specifications</h2>
                        <div className="grid grid-cols-3 gap-4">
                            {options.showHdd && (
                                <div>
                                    <div className="text-[10px] font-bold uppercase" style={{ color: "#6b7280" }}>HDD/SSD</div>
                                    <div className="text-sm">{asset.hdd || "-"}</div>
                                </div>
                            )}
                            {options.showRam && (
                                <div>
                                    <div className="text-[10px] font-bold uppercase" style={{ color: "#6b7280" }}>RAM</div>
                                    <div className="text-sm">{asset.ram || "-"}</div>
                                </div>
                            )}
                            {options.showCpu && (
                                <div>
                                    <div className="text-[10px] font-bold uppercase" style={{ color: "#6b7280" }}>CPU</div>
                                    <div className="text-sm">{asset.cpu || "-"}</div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Remarks */}
                <div className="mb-6 page-break-inside-avoid">
                    <h2 className="text-sm font-bold border-b pb-1 mb-3 uppercase tracking-wider" style={{ borderColor: "#d1d5db" }}>Remarks</h2>
                    <div>
                        <div className="text-sm">{asset.remarks || "-"}</div>
                    </div>
                </div>

                {/* Images */}
                {options.showImages && (asset.images?.length || asset.image) && (
                    <div className="break-inside-avoid mt-4">
                        <h2 className="text-sm font-bold border-b pb-1 mb-3 uppercase tracking-wider" style={{ borderColor: "#d1d5db" }}>Asset Images</h2>
                        <div className="grid grid-cols-3 gap-4">
                            {(asset.images && asset.images.length > 0 ? asset.images : (asset.image ? [asset.image] : [])).map((img, idx) => (
                                <div
                                    key={idx}
                                    className="border p-1 rounded flex items-center justify-center h-48"
                                    style={{ borderColor: "#e5e7eb", backgroundColor: "#f9fafb" }}
                                >
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
