import React from "react";
import { AuditLog, Asset } from "@/lib/types";
import { CheckCircle, AlertCircle } from "lucide-react";

interface PrintableAuditReportProps {
    auditLog: AuditLog;
    foundAssets: Asset[];
    missingAssets: Asset[];
}

export const PrintableAuditReport = React.forwardRef<HTMLDivElement, PrintableAuditReportProps>(
    ({ auditLog, foundAssets, missingAssets }, ref) => {
        return (
            <div ref={ref} className="hidden print:block p-8 bg-white text-black print:text-[10pt]">
                {/* Header */}
                <div className="mb-6 border-b border-gray-300 pb-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-bold uppercase tracking-wide text-gray-900">Audit Report</h1>
                            <p className="text-xs text-gray-500 mt-1">Generated on {new Date().toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                            <div className="text-base font-bold text-gray-800">JTAP Asset Management</div>
                            <div className="text-xs text-gray-500">Asset Inventory Audit</div>
                        </div>
                    </div>
                </div>

                {/* Audit Summary */}
                <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4 break-inside-avoid">
                    <h2 className="mb-2 text-base font-bold text-gray-800 border-b border-gray-200 pb-1">Audit Summary</h2>
                    <div className="grid grid-cols-2 gap-y-2 gap-x-8 text-xs">
                        <div>
                            <span className="block font-semibold text-gray-600">Audit Date:</span>
                            <span className="text-gray-900">{new Date(auditLog.date).toLocaleString()}</span>
                        </div>
                        <div>
                            <span className="block font-semibold text-gray-600">Auditor:</span>
                            <span className="text-gray-900">{auditLog.auditedBy || "-"}</span>
                        </div>
                        <div>
                            <span className="block font-semibold text-gray-600">Total Assets:</span>
                            <span className="text-gray-900">{auditLog.totalAssets}</span>
                        </div>
                        <div>
                            <span className="block font-semibold text-gray-600">Status:</span>
                            <span className={`inline-flex items-center gap-1 font-bold ${auditLog.status === "Completed" ? "text-green-700" : "text-amber-600"}`}>
                                {auditLog.status}
                            </span>
                        </div>
                    </div>

                    <div className="mt-4 border-t border-gray-200 pt-2">
                        <div>
                            <span className="block font-semibold text-gray-600">Supervisor:</span>
                            {auditLog.supervisor1VerifiedBy ? (
                                <span className="flex items-center gap-1 text-green-700 font-medium">
                                    <CheckCircle className="h-3 w-3" /> {auditLog.supervisor1VerifiedBy}
                                </span>
                            ) : (
                                <span className="flex items-center gap-1 text-amber-600">
                                    <AlertCircle className="h-3 w-3" /> Pending
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Statistics */}
                <div className="mb-6 grid grid-cols-2 gap-4 break-inside-avoid">
                    <div className="rounded border border-green-200 bg-green-50 p-3 text-center">
                        <div className="text-xs font-medium text-green-800">Found Assets</div>
                        <div className="text-2xl font-bold text-green-700">{auditLog.scannedCount}</div>
                    </div>
                    <div className="rounded border border-red-200 bg-red-50 p-3 text-center">
                        <div className="text-xs font-medium text-red-800">Missing Assets</div>
                        <div className="text-2xl font-bold text-red-700">{auditLog.missingCount}</div>
                    </div>
                </div>

                {/* Missing Assets Table */}
                {missingAssets.length > 0 && (
                    <div className="mb-6 break-inside-avoid">
                        <h3 className="mb-2 text-base font-bold text-red-700 flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" /> Missing Assets ({missingAssets.length})
                        </h3>
                        <table className="w-full border-collapse border border-gray-300 text-xs">
                            <thead className="bg-red-50">
                                <tr>
                                    <th className="border border-gray-300 px-2 py-1 text-left font-semibold text-gray-800">Computer No.</th>
                                    <th className="border border-gray-300 px-2 py-1 text-left font-semibold text-gray-800">Serial No.</th>
                                    <th className="border border-gray-300 px-2 py-1 text-left font-semibold text-gray-800">Owner</th>
                                    <th className="border border-gray-300 px-2 py-1 text-left font-semibold text-gray-800">Department</th>
                                </tr>
                            </thead>
                            <tbody>
                                {missingAssets.map((asset) => (
                                    <tr key={asset.id} className="even:bg-gray-50">
                                        <td className="border border-gray-300 px-2 py-1 font-medium">{asset.computerNo}</td>
                                        <td className="border border-gray-300 px-2 py-1">{asset.serialNo}</td>
                                        <td className="border border-gray-300 px-2 py-1">{asset.owner || "-"}</td>
                                        <td className="border border-gray-300 px-2 py-1">{asset.department || "-"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Found Assets Table */}
                <div className="mb-6 break-inside-avoid">
                    <h3 className="mb-2 text-base font-bold text-green-700 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" /> Found Assets ({foundAssets.length})
                    </h3>
                    {/* Only show first 50 found assets to save paper if list is long, or show all? 
                        Let's show all for now but compact. */}
                    <table className="w-full border-collapse border border-gray-300 text-xs">
                        <thead className="bg-green-50">
                            <tr>
                                <th className="border border-gray-300 px-2 py-1 text-left font-semibold text-gray-800">Computer No.</th>
                                <th className="border border-gray-300 px-2 py-1 text-left font-semibold text-gray-800">Serial No.</th>
                                <th className="border border-gray-300 px-2 py-1 text-left font-semibold text-gray-800">Owner</th>
                                <th className="border border-gray-300 px-2 py-1 text-left font-semibold text-gray-800">Department</th>
                            </tr>
                        </thead>
                        <tbody>
                            {foundAssets.map((asset) => (
                                <tr key={asset.id} className="even:bg-gray-50">
                                    <td className="border border-gray-300 px-2 py-1 font-medium">{asset.computerNo}</td>
                                    <td className="border border-gray-300 px-2 py-1">{asset.serialNo}</td>
                                    <td className="border border-gray-300 px-2 py-1">{asset.owner || "-"}</td>
                                    <td className="border border-gray-300 px-2 py-1">{asset.department || "-"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Signatures */}
                <div className="mt-12 grid grid-cols-2 gap-8 pt-8 border-t border-gray-300 page-break-inside-avoid">
                    <div className="text-center">
                        <div className="mb-6 border-b border-gray-400"></div>
                        <p className="font-semibold text-gray-800 text-xs">Auditor</p>
                        <p className="text-[10px] text-gray-500">Signature & Date</p>
                    </div>
                    <div className="text-center">
                        <div className="mb-6 border-b border-gray-400"></div>
                        <p className="font-semibold text-gray-800 text-xs">Supervisor</p>
                        <p className="text-[10px] text-gray-500">Signature & Date</p>
                    </div>
                </div>
            </div>
        );
    }
);

PrintableAuditReport.displayName = "PrintableAuditReport";
