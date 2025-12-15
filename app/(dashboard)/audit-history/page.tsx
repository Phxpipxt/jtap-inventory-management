"use client";

import { useState, useRef } from "react";
import { useInventory } from "@/hooks/useInventory";
import { useAuth } from "@/context/AuthContext";
import { Upload, Calendar, X, Eye, CheckCircle, AlertCircle, Printer, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";
import { useReactToPrint } from "react-to-print";
import { AlertModal } from "@/components/modals/AlertModal";
import { AuditDetailModal } from "@/components/modals/AuditDetailModal";
import { PrintableAuditReport } from "@/components/PrintableAuditReport";
import { useResizableColumns } from "@/hooks/useResizableColumns";
import { AuditLog } from "@/lib/types";

export default function AuditHistoryPage() {
    const { auditLogs, verifyAuditLog, assets } = useInventory();
    const { user } = useAuth();
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    // Printing
    const [printLog, setPrintLog] = useState<AuditLog | null>(null);
    const printRef = useRef<HTMLDivElement>(null);

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `Audit_Report_${printLog ? new Date(printLog.date).toISOString().split('T')[0] : ''}`,
    });

    const handlePrintClick = (log: AuditLog) => {
        setPrintLog(log);
        // Small delay to allow render
        setTimeout(() => {
            handlePrint();
        }, 100);
    };

    const [alertState, setAlertState] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        type: "default" | "error" | "success" | "warning";
    }>({
        isOpen: false,
        title: "",
        message: "",
        type: "default",
    });

    const showAlert = (title: string, message: string, type: "default" | "error" | "success" | "warning" = "default") => {
        setAlertState({ isOpen: true, title, message, type });
    };

    // Resizable Columns
    const { columnWidths, startResizing } = useResizableColumns({
        date: "180px",
        auditor: "150px",
        total: "80px",
        found: "80px",
        missing: "80px",
        status: "100px",
        supervisor1: "150px",
        actions: "140px",
    });

    // Filter logs based on date range
    const filteredLogs = auditLogs.filter((log) => {
        if (!startDate && !endDate) return true;

        const logDate = new Date(log.date);
        // Reset time part for accurate date comparison
        logDate.setHours(0, 0, 0, 0);

        const start = startDate ? new Date(startDate) : null;
        if (start) start.setHours(0, 0, 0, 0);

        const end = endDate ? new Date(endDate) : null;
        if (end) end.setHours(0, 0, 0, 0);

        if (start && end) {
            return logDate >= start && logDate <= end;
        } else if (start) {
            return logDate >= start;
        } else if (end) {
            return logDate <= end;
        }
        return true;
    });

    const handleExportHistory = () => {
        if (filteredLogs.length === 0) {
            showAlert("No Data", "No audit history to export.", "warning");
            return;
        }

        try {
            const data = filteredLogs.map(log => ({
                Date: new Date(log.date).toLocaleString(),
                "Total Assets": log.totalAssets,
                "Found": log.scannedCount,
                "Missing": log.missingCount,
                "Status": log.status,

                "Audited By": log.auditedBy || "-",
                "Supervisor": log.supervisor1VerifiedBy || "Pending"
            }));

            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Audit History");

            const dateRangeStr = startDate && endDate
                ? `${startDate}_to_${endDate}`
                : startDate
                    ? `from_${startDate}`
                    : endDate
                        ? `until_${endDate}`
                        : "All";

            XLSX.writeFile(wb, `Audit_History_${dateRangeStr}.xlsx`);
        } catch (error) {
            console.error("Export failed:", error);
            showAlert("Export Failed", "Failed to export audit history. Please try again.", "error");
        }
    };

    const handleExportLog = (log: AuditLog) => {
        try {
            const foundAssets = assets.filter(a => log.scannedIds.includes(a.id));
            const missingAssets = log.missingIds
                ? assets.filter(a => log.missingIds?.includes(a.id))
                : [];

            // Create workbook
            const wb = XLSX.utils.book_new();

            // 1. Summary Sheet
            const summaryData = [
                ["AUDIT REPORT SUMMARY"],
                ["Date", new Date(log.date).toLocaleString()],
                ["Auditor", log.auditedBy || "-"],
                ["Supervisor", log.supervisor1VerifiedBy || "Pending"],
                ["Status", log.status],
                [],
                ["ASSET STATISTICS"],
                ["Total Assets", log.totalAssets],
                ["Found Assets", log.scannedCount],
                ["Missing Assets", log.missingCount],
            ];
            const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
            XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

            // 2. Missing Assets Sheet (Priority)
            const missingData = missingAssets.map(a => ({
                "Status": "MISSING",
                "Computer No.": a.computerNo,
                "Serial No.": a.serialNo,
                "Brand": a.brand,
                "Model": a.model,
                "Owner": a.owner,
                "Department": a.department
            }));
            const wsMissing = XLSX.utils.json_to_sheet(missingData);
            XLSX.utils.book_append_sheet(wb, wsMissing, "Missing Assets");

            // 3. Found Assets Sheet
            const foundData = foundAssets.map(a => ({
                "Status": "FOUND",
                "Computer No.": a.computerNo,
                "Serial No.": a.serialNo,
                "Brand": a.brand,
                "Model": a.model,
                "Owner": a.owner,
                "Department": a.department
            }));
            const wsFound = XLSX.utils.json_to_sheet(foundData);
            XLSX.utils.book_append_sheet(wb, wsFound, "Found Assets");

            // 4. Master List (All Assets)
            const allAssetsData = [...missingAssets, ...foundAssets].map(a => ({
                "Audit Status": missingAssets.find(m => m.id === a.id) ? "MISSING" : "FOUND",
                "Computer No.": a.computerNo,
                "Serial No.": a.serialNo,
                "Brand": a.brand,
                "Model": a.model,
                "Owner": a.owner,
                "Department": a.department,
                "Current Status": a.status
            }));
            const wsAll = XLSX.utils.json_to_sheet(allAssetsData);
            XLSX.utils.book_append_sheet(wb, wsAll, "Master List");

            // Download
            XLSX.writeFile(wb, `Audit_Report_${new Date(log.date).toISOString().split('T')[0]}.xlsx`);
        } catch (error) {
            console.error("Export failed:", error);
            showAlert("Export Failed", "Failed to export audit report.", "error");
        }
    };

    const handleVerify = (log: AuditLog) => {
        if (!user) return;
        // Always verify as step 1 (Supervisor)
        verifyAuditLog(log.id, user.name, 1);
        showAlert("Success", `Audit verified by Supervisor.`, "success");
    };

    return (
        <div className="space-y-6 pb-20 md:pb-0">
            <AlertModal
                isOpen={alertState.isOpen}
                onClose={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
                title={alertState.title}
                message={alertState.message}
                type={alertState.type}
            />
            <AuditDetailModal
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                auditLog={selectedLog}
            />
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <h1 className="text-2xl font-bold text-slate-800">Audit History</h1>

            </div>

            <div className="rounded-lg bg-white p-3 shadow-sm md:p-6">
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center hidden md:flex">
                    <div className="flex flex-col gap-4 w-full sm:flex-row sm:items-center sm:w-auto sm:gap-2">
                        <div className="flex flex-col gap-1.5 w-full sm:w-40">
                            <span className="text-xs font-medium text-slate-500 ml-1">From</span>
                            <div className="relative w-full">
                                <Calendar className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                                <input
                                    type="date"
                                    value={startDate}
                                    max={endDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full rounded-md border border-slate-300 pl-8 pr-2 py-2 text-sm text-black focus:border-blue-500 focus:outline-none"
                                />
                            </div>
                        </div>
                        <div className="flex flex-col gap-1.5 w-full sm:w-40">
                            <span className="text-xs font-medium text-slate-500 ml-1">To</span>
                            <div className="relative w-full">
                                <Calendar className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                                <input
                                    type="date"
                                    value={endDate}
                                    min={startDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full rounded-md border border-slate-300 pl-8 pr-2 py-2 text-sm text-black focus:border-blue-500 focus:outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {(startDate || endDate) && (
                        <button
                            onClick={() => {
                                setStartDate("");
                                setEndDate("");
                            }}
                            className="flex items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 sm:ml-2 transition-colors shadow-sm cursor-pointer w-full sm:w-auto"
                            title="Clear Date Filters"
                        >
                            <X className="h-4 w-4" />
                            Clear Filter
                        </button>
                    )}

                    <div className="flex-1"></div>

                    <button
                        onClick={handleExportHistory}
                        className="flex items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 shadow-sm md:w-auto cursor-pointer whitespace-nowrap"
                        title="Export Audit History to Excel"
                    >
                        <Upload className="h-4 w-4" />
                        Export History
                    </button>
                </div>

                {/* Mobile Card View */}
                <div className="grid gap-4 md:hidden">
                    {filteredLogs.length === 0 ? (
                        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                            No audit history found for the selected period.
                        </div>
                    ) : (
                        filteredLogs.map((log) => (
                            <div key={log.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                                <div className="mb-3 flex items-start justify-between">
                                    <div>
                                        <div className="font-medium text-slate-900">{new Date(log.date).toLocaleString()}</div>
                                        <div className="text-xs text-slate-500">Auditor: {log.auditedBy || "-"}</div>
                                        <div className="mt-2 space-y-1">
                                            <div className="flex items-center gap-1 text-xs">
                                                <span className="font-medium text-slate-600">Supervisor:</span>
                                                {log.supervisor1VerifiedBy ? (
                                                    <span className="text-green-600 flex items-center gap-0.5">
                                                        <CheckCircle className="h-3 w-3" /> {log.supervisor1VerifiedBy}
                                                    </span>
                                                ) : (
                                                    <span className="text-amber-500 flex items-center gap-0.5">
                                                        <AlertCircle className="h-3 w-3" /> Pending
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-800">
                                            {log.status}
                                        </span>
                                        <button
                                            onClick={() => {
                                                setSelectedLog(log);
                                                setIsDetailModalOpen(true);
                                            }}
                                            className="flex items-center gap-1 rounded-md bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 cursor-pointer"
                                        >
                                            <Eye className="h-3.5 w-3.5" />
                                            View
                                        </button>

                                        {/* Mobile Verify Buttons */}
                                        {/* Only show verify button if not verified yet and user is authorized */}
                                        {!log.supervisor1VerifiedBy && user && ["Suradet Sarnyos", "Phakkhawat Khamkon"].includes(user.name) && (
                                            <button
                                                onClick={() => handleVerify(log)}
                                                className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 cursor-pointer"
                                            >
                                                Verify
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-center">
                                    <div>
                                        <div className="text-xs text-slate-500">Total</div>
                                        <div className="font-medium text-slate-900">{log.totalAssets}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-slate-500">Found</div>
                                        <div className="font-medium text-green-600">{log.scannedCount}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-slate-500">Missing</div>
                                        <div className="font-medium text-red-600">{log.missingCount}</div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Desktop Table View */}
                <div className="hidden overflow-x-auto md:block">
                    <table className="min-w-full divide-y divide-slate-200 table-fixed">
                        <thead className="bg-slate-100 sticky top-0 z-10 shadow-sm">
                            <tr>
                                {[
                                    { id: "date", label: "Date" },
                                    { id: "auditor", label: "Auditor" },
                                    { id: "total", label: "Total" },
                                    { id: "found", label: "Found" },
                                    { id: "missing", label: "Missing" },
                                    { id: "status", label: "Status" },
                                    { id: "supervisor1", label: "Supervisor" },
                                    { id: "actions", label: "" },
                                ].map((col) => (
                                    <th
                                        key={col.id}
                                        className="relative px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-700 select-none group overflow-hidden text-ellipsis whitespace-nowrap"
                                        style={{ width: columnWidths[col.id] }}
                                    >
                                        {col.label}
                                        <div
                                            className="absolute right-0 top-0 h-full w-4 cursor-col-resize hover:bg-blue-400/20 group-hover:bg-slate-300/50 z-20"
                                            onMouseDown={(e) => startResizing(e, col.id)}
                                        >
                                            <div className="absolute right-0 top-0 h-full w-[1px] bg-slate-200 group-hover:bg-blue-400" />
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                            {filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-6 py-8 text-center text-sm text-slate-500">
                                        No audit history found for the selected period.
                                    </td>
                                </tr>
                            ) : (
                                filteredLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-900">
                                            {new Date(log.date).toLocaleString()}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">{log.auditedBy || "-"}</td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">{log.totalAssets}</td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-green-600 font-medium">{log.scannedCount}</td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-red-600 font-medium">{log.missingCount}</td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm">
                                            <span className="inline-flex rounded-full bg-slate-100 px-2 text-xs font-semibold leading-5 text-slate-800">
                                                {log.status}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm">
                                            {log.supervisor1VerifiedBy ? (
                                                <div className="flex items-center gap-1 text-green-600">
                                                    <CheckCircle className="h-4 w-4" />
                                                    <span className="font-medium">{log.supervisor1VerifiedBy}</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1 text-amber-500">
                                                    <AlertCircle className="h-4 w-4" />
                                                    <span className="text-xs">Pending</span>
                                                    {/* Only allow specific supervisors to verify */}
                                                    {user && ["Suradet Sarnyos", "Phakkhawat Khamkon"].includes(user.name) && (
                                                        <button
                                                            onClick={() => handleVerify(log)}
                                                            className="ml-2 rounded bg-green-600 px-2 py-0.5 text-xs text-white hover:bg-green-700 cursor-pointer"
                                                            title="Verify Audit Log"
                                                        >
                                                            Verify
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm">
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => handlePrintClick(log)}
                                                    className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                                                    title="Print Audit Report"
                                                >
                                                    <Printer className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleExportLog(log)}
                                                    className="rounded p-1.5 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 cursor-pointer"
                                                    title="Export Audit Report to Excel"
                                                >
                                                    <FileSpreadsheet className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setSelectedLog(log);
                                                        setIsDetailModalOpen(true);
                                                    }}
                                                    className="flex items-center gap-1 rounded-md bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 cursor-pointer"
                                                    title="View Audit Details"
                                                >
                                                    <Eye className="h-3 w-3" />
                                                    View
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

            {/* Hidden Printable Component */}
            <div className="hidden">
                {printLog && (
                    <PrintableAuditReport
                        ref={printRef}
                        auditLog={printLog}
                        foundAssets={assets.filter(a => printLog.scannedIds.includes(a.id))}
                        missingAssets={printLog.missingIds ? assets.filter(a => printLog.missingIds?.includes(a.id)) : []}
                    />
                )}
            </div>
        </div>
    );
}
