"use client";

import { useState, useMemo } from "react";
import { useInventory } from "@/hooks/useInventory";
import { Search, Filter, Upload, Calendar, X, FileText, User, ArrowUpDown, Plus, Trash2, Pencil, ClipboardCheck } from "lucide-react";
// import * as XLSX from "xlsx";
import { AlertModal } from "@/components/modals/AlertModal";
import { useResizableColumns } from "@/hooks/useResizableColumns";
import { LogEntry } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";

// Helper: Initials Avatar
const InitialsAvatar = ({ name }: { name: string }) => {
    const initials = name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();

    const colors = [
        "bg-red-100 text-red-600",
        "bg-orange-100 text-orange-600",
        "bg-amber-100 text-amber-600",
        "bg-green-100 text-green-600",
        "bg-emerald-100 text-emerald-600",
        "bg-teal-100 text-teal-600",
        "bg-cyan-100 text-cyan-600",
        "bg-sky-100 text-sky-600",
        "bg-blue-100 text-blue-600",
        "bg-indigo-100 text-indigo-600",
        "bg-violet-100 text-violet-600",
        "bg-purple-100 text-purple-600",
        "bg-fuchsia-100 text-fuchsia-600",
        "bg-pink-100 text-pink-600",
        "bg-rose-100 text-rose-600",
    ];

    // Consistent color based on name length
    const colorIndex = name.length % colors.length;
    const colorClass = colors[colorIndex];

    return (
        <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${colorClass} shadow-sm ring-1 ring-white`}>
            {initials}
        </div>
    );
};

// Helper: Safe Date Formatting
function formatDateSafe(timestamp: string) {
    try {
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) return { date: "Invalid Date", time: "" };
        return {
            date: date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' }),
            time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
        };
    } catch {
        return { date: "Error", time: "" };
    }
}

function LogActionBadge({ action }: { action: string }) {
    const styles = {
        "Add": "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
        "Update": "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
        "Delete": "bg-red-50 text-red-700 ring-red-600/20",
        "Check-in": "bg-sky-50 text-sky-700 ring-sky-600/20",
        "Check-out": "bg-amber-50 text-amber-700 ring-amber-600/20",
        "Dispose": "bg-rose-50 text-rose-700 ring-rose-600/20",
        "Audit": "bg-violet-50 text-violet-700 ring-violet-600/20",
        "Import": "bg-blue-50 text-blue-700 ring-blue-600/20",
    };

    const defaultStyle = "bg-gray-50 text-gray-600 ring-gray-500/10";
    const className = styles[action as keyof typeof styles] || defaultStyle;

    return (
        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${className}`}>
            {action}
        </span>
    );
}

export default function LogsPage() {
    const { logs, logsLoading } = useInventory();
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
        action: "120px",
        asset: "160px",
        performedBy: "200px",
        details: "300px",
    });

    const filteredLogs = useMemo(() => {
        return logs.filter((log) => {
            const matchesSearch =
                log.computerNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.adminUser.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.details?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesAction =
                actionFilter === "All" ||
                (actionFilter === "Check-in / Check-out"
                    ? (log.action === "Check-in" || log.action === "Check-out")
                    : actionFilter === "Deleted"
                        ? log.action === "Delete"
                        : actionFilter === "Disposed"
                            ? log.action === "Dispose"
                            : log.action === actionFilter);

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
    }, [logs, searchTerm, actionFilter, startDate, endDate]);

    const handleExport = async () => {
        if (filteredLogs.length === 0) {
            showAlert("No Data", "No logs to export.", "warning");
            return;
        }

        try {
            const XLSX = await import("xlsx");
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
        <div className="space-y-6 pb-20 md:pb-0 font-inter">
            <AlertModal
                isOpen={alertState.isOpen}
                onClose={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
                title={alertState.title}
                message={alertState.message}
                type={alertState.type}
            />

            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Activity Logs</h1>
                    <p className="text-sm text-slate-500 mt-1">Track and audit all asset movements and changes.</p>
                </div>
            </div>

            {/* Filters */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-6">
                    {/* Search */}
                    <div className="md:col-span-6 lg:col-span-5 relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Search by Asset ID, User, or Details..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                        />
                    </div>

                    {/* Date Range & Export */}
                    <div className="hidden md:flex md:col-span-6 lg:col-span-7 flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <div className="relative flex-1 min-w-0">
                            <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <input
                                type="date"
                                value={startDate}
                                max={endDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none"
                                placeholder="From"
                                aria-label="Start Date"
                            />
                        </div>
                        <span className="text-slate-400 text-sm font-medium text-center hidden sm:block">to</span>
                        <div className="relative flex-1 min-w-0">
                            <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <input
                                type="date"
                                value={endDate}
                                min={startDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none"
                                placeholder="To"
                                aria-label="End Date"
                            />
                        </div>
                        {(startDate || endDate) && (
                            <button
                                onClick={() => { setStartDate(""); setEndDate(""); }}
                                className="sm:w-auto p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-red-500 transition-colors flex items-center justify-center cursor-pointer shadow-sm active:scale-95"
                                title="Clear Dates"
                            >
                                <X className="h-4 w-4" />
                                <span className="sm:hidden ml-2 text-sm font-medium">Clear Dates</span>
                            </button>
                        )}
                        <button
                            onClick={handleExport}
                            className="md:hidden flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition-all active:scale-95 sm:w-auto"
                        >
                            <Upload className="h-4 w-4" />
                            <span>Export</span>
                        </button>
                        <button
                            onClick={handleExport}
                            className="hidden md:flex group items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98]"
                        >
                            <Upload className="h-4 w-4 transition-transform group-hover:-translate-y-0.5" />
                            <span>Export Report</span>
                        </button>
                    </div>

                    {/* Action Tabs - Desktop & Mobile (Refined) */}
                    <div className="md:col-span-12 lg:col-span-12">
                        <div className="overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:pb-0 scrollbar-hide">
                            <div className="flex items-center gap-1.5 min-w-max bg-slate-100/50 p-1.5 rounded-xl border border-slate-200/60">
                                {[
                                    { id: "All", label: "All", icon: Filter },
                                    { id: "Add", label: "Add", icon: Plus },
                                    { id: "Deleted", label: "Deleted", icon: Trash2 },
                                    { id: "Update", label: "Update", icon: Pencil },
                                    { id: "Check-in / Check-out", label: "Check-in/Out", icon: ArrowUpDown },
                                    { id: "Disposed", label: "Disposed", icon: Trash2 },
                                    { id: "Audit", label: "Audit", icon: ClipboardCheck },
                                    { id: "Import", label: "Import", icon: Upload },
                                ].map((tab) => {
                                    const isActive = actionFilter === tab.id;
                                    const Icon = tab.icon;

                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActionFilter(tab.id)}
                                            className={`
                                                relative flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap z-10
                                                ${isActive ? "text-blue-700" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"}
                                            `}
                                        >
                                            {isActive && (
                                                <motion.div
                                                    layoutId="activeTab"
                                                    className="absolute inset-0 bg-white rounded-lg shadow-sm border border-slate-200/60 -z-10"
                                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                                />
                                            )}
                                            <Icon className={`w-3.5 h-3.5 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
                                            <span>{tab.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>



            </motion.div >

            {/* Table */}
            < motion.div
                initial={{ opacity: 0, y: 20 }
                }
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="hidden md:block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                        <thead className="bg-slate-50/80 backdrop-blur supports-[backdrop-filter]:bg-slate-50/80 sticky top-0 z-10">
                            <tr>
                                {[
                                    { id: "date", label: "Date & Time", icon: Calendar },
                                    { id: "action", label: "Action", icon: FileText },
                                    { id: "asset", label: "Asset Information" },
                                    { id: "performedBy", label: "Performed By", icon: User },
                                    { id: "details", label: "Details / Notes", icon: FileText },
                                ].map((col) => (
                                    <th
                                        key={col.id}
                                        className="relative group px-6 py-4 font-semibold text-slate-700 select-none whitespace-nowrap"
                                        style={{ width: columnWidths[col.id] }}
                                    >
                                        <div className="flex items-center gap-2">
                                            {col.icon && <col.icon className="h-3.5 w-3.5 text-slate-400" />}
                                            {col.label}
                                        </div>
                                        {/* Resize Handle */}
                                        <div
                                            className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-400/50 group-hover:bg-slate-200/50"
                                            onMouseDown={(e) => startResizing(e, col.id)}
                                        />
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            <AnimatePresence>
                                {logsLoading ? (
                                    [...Array(5)].map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td className="px-6 py-4"><div className="h-4 w-32 rounded bg-slate-100" /></td>
                                            <td className="px-6 py-4"><div className="h-6 w-20 rounded bg-slate-100" /></td>
                                            <td className="px-6 py-4"><div className="h-4 w-24 rounded bg-slate-100" /></td>
                                            <td className="px-6 py-4"><div className="h-8 w-8 rounded-full bg-slate-100" /></td>
                                            <td className="px-6 py-4"><div className="h-4 w-48 rounded bg-slate-100" /></td>
                                        </tr>
                                    ))
                                ) : filteredLogs.length > 0 ? (
                                    filteredLogs.map((log, index) => {
                                        const { date, time } = formatDateSafe(log.timestamp);
                                        return (
                                            <motion.tr
                                                key={log.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: index * 0.03 }}
                                                className="group hover:bg-blue-50/30 transition-colors"
                                            >
                                                {/* Date */}
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold text-slate-700">{date}</span>
                                                        <span className="text-xs text-slate-400 font-mono mt-0.5">{time}</span>
                                                    </div>
                                                </td>

                                                {/* Action */}
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <LogActionBadge action={log.action} />
                                                </td>

                                                {/* Asset */}
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono font-medium text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-xs border border-slate-200">
                                                            {log.computerNo}
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* Performed By */}
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-3">
                                                        <InitialsAvatar name={log.adminUser} />
                                                        <span className="font-medium text-slate-700">{log.adminUser}</span>
                                                    </div>
                                                </td>

                                                {/* Details */}
                                                <td className="px-6 py-4 text-slate-600">
                                                    {log.details ? (
                                                        <span className="line-clamp-2" title={log.details}>
                                                            {log.details}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400 italic text-xs">-</span>
                                                    )}
                                                </td>
                                            </motion.tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                                            No activity logs found.
                                        </td>
                                    </tr>
                                )}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>
            </motion.div >

            {/* Mobile List View (Optimized) */}
            < div className="md:hidden space-y-4" >
                {
                    filteredLogs.map((log) => {
                        const { date, time } = formatDateSafe(log.timestamp);
                        return (
                            <div key={log.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                                <div className="flex items-center justify-between mb-3">
                                    <LogActionBadge action={log.action} />
                                    <span className="text-xs text-slate-400 font-mono">{date} {time}</span>
                                </div>
                                <div className="flex items-center gap-3 mb-3">
                                    <InitialsAvatar name={log.adminUser} />
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900">{log.adminUser}</p>
                                        <p className="text-xs text-slate-500">Action performed on <span className="font-mono bg-slate-100 px-1 rounded">{log.computerNo}</span></p>
                                    </div>
                                </div>
                                {log.details && (
                                    <div className="mt-2 pt-2 border-t border-slate-100">
                                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Details</p>
                                        <p className="text-sm text-slate-600 bg-slate-50 p-2 rounded-lg">{log.details}</p>
                                    </div>
                                )}
                            </div>
                        );
                    })
                }
            </div >
        </div >
    );
}
