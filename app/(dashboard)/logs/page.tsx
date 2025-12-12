"use client";

import { useState } from "react";
import { useInventory } from "@/hooks/useInventory";
import { Search, Filter, Upload, Calendar, X } from "lucide-react";
import * as XLSX from "xlsx";
import { AlertModal } from "@/components/modals/AlertModal";
import { useResizableColumns } from "@/hooks/useResizableColumns";

export default function LogsPage() {
    const { logs } = useInventory();
    const [searchTerm, setSearchTerm] = useState("");
    const [actionFilter, setActionFilter] = useState<string>("All");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

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
        action: "100px",
        asset: "150px",
        performedBy: "150px",
        details: "250px",
    });

    const filteredLogs = logs.filter((log) => {
        const matchesSearch =
            log.computerNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.adminUser.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.details?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesAction = actionFilter === "All" || log.action === actionFilter;

        let matchesDate = true;
        if (startDate || endDate) {
            const logDate = new Date(log.timestamp);
            logDate.setHours(0, 0, 0, 0);

            const start = startDate ? new Date(startDate) : null;
            if (start) start.setHours(0, 0, 0, 0);

            const end = endDate ? new Date(endDate) : null;
            if (end) end.setHours(0, 0, 0, 0);

            if (start && end) {
                matchesDate = logDate >= start && logDate <= end;
            } else if (start) {
                matchesDate = logDate >= start;
            } else if (end) {
                matchesDate = logDate <= end;
            }
        }

        return matchesSearch && matchesAction && matchesDate;
    });

    const handleExport = () => {
        if (filteredLogs.length === 0) {
            showAlert("No Data", "No logs to export.", "warning");
            return;
        }

        try {
            const data = filteredLogs.map(log => ({
                "Date": new Date(log.timestamp).toLocaleString(),
                "Action": log.action,
                "Asset": log.computerNo,
                "Performed By": log.adminUser,
                "Details": log.details || "-"
            }));

            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Activity Logs");
            XLSX.writeFile(wb, `Activity_Logs_${new Date().toISOString().split('T')[0]}.xlsx`);
        } catch (error) {
            console.error("Export failed:", error);
            showAlert("Export Failed", "Failed to export activity logs. Please try again.", "error");
        }
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
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-slate-900">Activity Logs</h1>
                <button
                    onClick={handleExport}
                    className="flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 shadow-sm cursor-pointer"
                    title="Export Activity Logs to Excel"
                >
                    <Upload className="h-4 w-4" />
                    <span className="hidden md:inline">Export Report</span>
                    <span className="md:hidden">Export</span>
                </button>
            </div>

            <div className="flex flex-col gap-3 rounded-lg bg-white p-3 shadow-md border border-slate-100 md:p-4">
                <div className="grid grid-cols-2 gap-1 md:flex md:items-center md:gap-4">
                    {/* Search */}
                    <div className="relative col-span-1 min-w-0 md:flex-1">
                        <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search logs..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full min-w-0 rounded-md border border-slate-300 pl-8 pr-2 py-2 text-xs text-black placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 md:text-sm md:pl-10 md:pr-4"
                        />
                    </div>

                    {/* Filter */}
                    <div className="relative col-span-1 min-w-0 md:w-48">
                        <Filter className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                        <select
                            value={actionFilter}
                            onChange={(e) => setActionFilter(e.target.value)}
                            className="w-full min-w-0 appearance-none rounded-md border border-slate-300 bg-white pl-8 pr-6 py-2 text-xs text-black focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 md:text-sm md:pl-10 md:pr-8"
                        >
                            <option value="All">All Actions</option>
                            <option value="Add">Add</option>
                            <option value="Update">Update</option>
                            <option value="Delete">Delete</option>
                            <option value="Check-in">Check-in</option>
                            <option value="Check-out">Check-out</option>
                            <option value="Audit">Audit</option>
                        </select>
                    </div>

                    {/* From Date - Desktop Only */}
                    <div className="relative col-span-2 md:col-span-1 md:w-auto hidden md:block">
                        <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:gap-2">
                            <span className="text-xs font-medium text-slate-500 ml-1 md:hidden">From</span>
                            <div className="relative w-full">
                                <Calendar className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                                <input
                                    type="date"
                                    value={startDate}
                                    max={endDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full rounded-md border border-slate-300 pl-10 pr-2 py-2 text-sm text-black focus:border-blue-500 focus:outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* To Date - Desktop Only */}
                    <div className="relative col-span-2 md:col-span-1 md:w-auto hidden md:block">
                        <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:gap-2">
                            <span className="text-xs font-medium text-slate-500 ml-1 md:hidden">To</span>
                            <div className="relative w-full">
                                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                                <input
                                    type="date"
                                    value={endDate}
                                    min={startDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full rounded-md border border-slate-300 pl-10 pr-2 py-2 text-sm text-black focus:border-blue-500 focus:outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Clear Date - Desktop Only */}
                    {(startDate || endDate) && (
                        <div className="col-span-2 md:col-span-1 md:w-auto hidden md:block">
                            <button
                                onClick={() => {
                                    setStartDate("");
                                    setEndDate("");
                                }}
                                className="flex w-full items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm cursor-pointer md:w-auto"
                                title="Clear Date Filters"
                            >
                                <X className="h-4 w-4" />
                                Clear Date
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Mobile Card View */}
            <div className="grid gap-4 md:hidden">
                {filteredLogs.length === 0 ? (
                    <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
                        No logs found matching your criteria.
                    </div>
                ) : (
                    filteredLogs.map((log) => (
                        <div key={log.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                            <div className="flex items-center justify-between mb-3">
                                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold leading-5 ${log.action === "Add" ? "bg-green-100 text-green-800 border border-green-200" :
                                    log.action === "Delete" ? "bg-red-100 text-red-800 border border-red-200" :
                                        log.action === "Update" ? "bg-purple-100 text-purple-800 border border-purple-200" :
                                            log.action === "Check-in" ? "bg-sky-100 text-sky-800 border border-sky-200" :
                                                log.action === "Check-out" ? "bg-amber-100 text-amber-800 border border-amber-200" :
                                                    "bg-slate-100 text-slate-800 border border-slate-200"
                                    }`}>
                                    {log.action}
                                </span>
                                <span className="text-xs text-slate-500">{new Date(log.timestamp).toLocaleString()}</span>
                            </div>
                            <div className="mb-2">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-xs text-slate-500 mb-0.5">Asset</p>
                                        <p className="text-sm font-bold text-slate-900">{log.computerNo}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-slate-500 mb-0.5">Performed By</p>
                                        <p className="text-sm font-medium text-slate-700">{log.adminUser}</p>
                                    </div>
                                </div>
                            </div>
                            {log.details && (
                                <div className="mt-3 border-t border-slate-100 pt-2">
                                    <p className="text-xs text-slate-500 mb-1">Details</p>
                                    <p className="text-sm text-slate-600">{log.details}</p>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            <div className="hidden overflow-hidden rounded-lg border border-slate-200 bg-white shadow-md md:block">
                <div className="max-h-[600px] overflow-y-auto">
                    <table className="min-w-full divide-y divide-slate-200 table-fixed">
                        <thead className="bg-slate-100 sticky top-0 z-10 shadow-sm">
                            <tr>
                                {[
                                    { id: "date", label: "Date & Time" },
                                    { id: "action", label: "Action" },
                                    { id: "asset", label: "Asset" },
                                    { id: "performedBy", label: "Performed By" },
                                    { id: "details", label: "Details" },
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
                                    <td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-500">
                                        No logs found matching your criteria.
                                    </td>
                                </tr>
                            ) : (
                                filteredLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                                            {new Date(log.timestamp).toLocaleString()}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4">
                                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold leading-5 ${log.action === "Add" ? "bg-green-100 text-green-800 border border-green-200" :
                                                log.action === "Delete" ? "bg-red-100 text-red-800 border border-red-200" :
                                                    log.action === "Update" ? "bg-purple-100 text-purple-800 border border-purple-200" :
                                                        log.action === "Check-in" ? "bg-sky-100 text-sky-800 border border-sky-200" :
                                                            log.action === "Check-out" ? "bg-amber-100 text-amber-800 border border-amber-200" :
                                                                "bg-slate-100 text-slate-800 border border-slate-200"
                                                }`}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-slate-900">
                                            {log.computerNo}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-700">
                                            {log.adminUser}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            {log.details || "-"}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
