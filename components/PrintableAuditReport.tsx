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
            <div ref={ref} className="p-8 print:p-8 bg-[#ffffff] text-[#000000] w-[210mm] mx-auto min-h-[297mm] border border-[#0f172a] print:border-[#000000] relative">
                {/* Header */}
                <div className="mb-6 border-b border-[#000000] pb-4 flex justify-between items-start">
                    <div>
                        <img src="/jtekt_logo.png" alt="Company Logo" className="h-10 object-contain mb-2" />
                        <h1 className="text-2xl font-bold uppercase tracking-tight">Audit Report</h1>
                    </div>
                    <div className="text-right">
                        <div className="text-[10px] text-[#6b7280] uppercase">Generated on</div>
                        <div className="text-xs font-medium text-[#0f172a]">
                            {new Date().toLocaleString()}
                        </div>
                    </div>
                </div>

                {/* Audit Summary */}
                <div className="mb-6 rounded border border-[#d1d5db] bg-[#f9fafb] p-4 break-inside-avoid">
                    <h2 className="mb-2 text-sm font-bold border-b border-[#d1d5db] pb-1 uppercase tracking-wider">Audit Summary</h2>
                    <div className="grid grid-cols-2 gap-y-2 gap-x-8 text-xs">
                        <div>
                            <span className="block font-bold text-[#6b7280] uppercase text-[10px]">Audit Date</span>
                            <span className="text-[#111827] font-medium">{new Date(auditLog.date).toLocaleString()}</span>
                        </div>
                        <div>
                            <span className="block font-bold text-[#6b7280] uppercase text-[10px]">Auditor</span>
                            <span className="text-[#111827] font-medium">{auditLog.auditedBy || "-"}</span>
                        </div>
                        <div>
                            <span className="block font-bold text-[#6b7280] uppercase text-[10px]">Total Assets</span>
                            <span className="text-[#111827] font-medium">{auditLog.totalAssets}</span>
                        </div>
                        <div>
                            <span className="block font-bold text-[#6b7280] uppercase text-[10px]">Status</span>
                            <span className={`inline-flex items-center gap-1 font-bold ${auditLog.status === "Completed" ? "text-[#15803d]" : "text-[#d97706]"}`}>
                                {auditLog.status}
                            </span>
                        </div>
                    </div>

                    <div className="mt-4 border-t border-[#e5e7eb] pt-2">
                        <div>
                            <span className="block font-bold text-[#6b7280] uppercase text-[10px]">Supervisor</span>
                            {auditLog.supervisor1VerifiedBy ? (
                                <span className="flex items-center gap-1 text-[#15803d] font-medium text-xs">
                                    <CheckCircle className="h-3 w-3" /> {auditLog.supervisor1VerifiedBy}
                                </span>
                            ) : (
                                <span className="flex items-center gap-1 text-[#d97706] font-medium text-xs">
                                    <AlertCircle className="h-3 w-3" /> Pending
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Statistics */}
                <div className="mb-6 grid grid-cols-2 gap-4 break-inside-avoid">
                    <div className="rounded border border-[#bbf7d0] bg-[#f0fdf4] p-3 text-center">
                        <div className="text-[10px] font-bold text-[#166534] uppercase">Found Assets</div>
                        <div className="text-2xl font-bold text-[#15803d]">{auditLog.scannedCount}</div>
                    </div>
                    <div className="rounded border border-[#fecaca] bg-[#fef2f2] p-3 text-center">
                        <div className="text-[10px] font-bold text-[#991b1b] uppercase">Missing Assets</div>
                        <div className="text-2xl font-bold text-[#b91c1c]">{auditLog.missingCount}</div>
                    </div>
                </div>

                {/* Missing Assets Table */}
                {missingAssets.length > 0 && (
                    <div className="mb-6 break-inside-avoid">
                        <h3 className="mb-2 text-sm font-bold text-[#b91c1c] flex items-center gap-2 uppercase tracking-wider">
                            Missing Assets ({missingAssets.length})
                        </h3>
                        <table className="w-full border-collapse border border-[#d1d5db] text-xs">
                            <thead className="bg-[#fef2f2]">
                                <tr>
                                    <th className="border border-[#d1d5db] px-2 py-1 text-left font-bold text-[#1f2937]">Computer No.</th>
                                    <th className="border border-[#d1d5db] px-2 py-1 text-left font-bold text-[#1f2937]">Serial No.</th>
                                    <th className="border border-[#d1d5db] px-2 py-1 text-left font-bold text-[#1f2937]">Owner</th>
                                    <th className="border border-[#d1d5db] px-2 py-1 text-left font-bold text-[#1f2937]">Department</th>
                                </tr>
                            </thead>
                            <tbody>
                                {missingAssets.map((asset) => (
                                    <tr key={asset.id} className="even:bg-[#f9fafb]">
                                        <td className="border border-[#d1d5db] px-2 py-1 font-bold text-[#dc2626]">{asset.computerNo}</td>
                                        <td className="border border-[#d1d5db] px-2 py-1">{asset.serialNo}</td>
                                        <td className="border border-[#d1d5db] px-2 py-1">{asset.owner || "-"}</td>
                                        <td className="border border-[#d1d5db] px-2 py-1">{asset.department || "-"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Found Assets Table */}
                <div className="mb-6 break-inside-avoid">
                    <h3 className="mb-2 text-sm font-bold text-[#15803d] flex items-center gap-2 uppercase tracking-wider">
                        Found Assets ({foundAssets.length})
                    </h3>
                    <table className="w-full border-collapse border border-[#d1d5db] text-xs">
                        <thead className="bg-[#f0fdf4]">
                            <tr>
                                <th className="border border-[#d1d5db] px-2 py-1 text-left font-bold text-[#1f2937]">Computer No.</th>
                                <th className="border border-[#d1d5db] px-2 py-1 text-left font-bold text-[#1f2937]">Serial No.</th>
                                <th className="border border-[#d1d5db] px-2 py-1 text-left font-bold text-[#1f2937]">Owner</th>
                                <th className="border border-[#d1d5db] px-2 py-1 text-left font-bold text-[#1f2937]">Department</th>
                            </tr>
                        </thead>
                        <tbody>
                            {foundAssets.map((asset) => (
                                <tr key={asset.id} className="even:bg-[#f9fafb]">
                                    <td className="border border-[#d1d5db] px-2 py-1 font-medium">{asset.computerNo}</td>
                                    <td className="border border-[#d1d5db] px-2 py-1">{asset.serialNo}</td>
                                    <td className="border border-[#d1d5db] px-2 py-1">{asset.owner || "-"}</td>
                                    <td className="border border-[#d1d5db] px-2 py-1">{asset.department || "-"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Signatures */}
                <div className="mt-12 grid grid-cols-2 gap-8 pt-8 border-t border-[#d1d5db] page-break-inside-avoid">
                    <div className="text-center">
                        <div className="mb-6 border-b border-[#9ca3af]"></div>
                        <p className="font-bold text-[#1f2937] text-xs uppercase">Auditor</p>
                        <p className="text-[10px] text-[#6b7280]">Signature & Date</p>
                    </div>
                    <div className="text-center">
                        <div className="mb-6 border-b border-[#9ca3af]"></div>
                        <p className="font-bold text-[#1f2937] text-xs uppercase">Supervisor</p>
                        <p className="text-[10px] text-[#6b7280]">Signature & Date</p>
                    </div>
                </div>
            </div>
        );
    }
);

PrintableAuditReport.displayName = "PrintableAuditReport";
