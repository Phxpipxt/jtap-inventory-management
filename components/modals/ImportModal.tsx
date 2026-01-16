import { useState, useRef } from "react";
import { Asset, Department, DEPARTMENTS, BRANDS, HDD_OPTIONS, RAM_OPTIONS } from "@/lib/types";
import { X, Upload, FileSpreadsheet, AlertTriangle, Download, AlertCircle, Save } from "lucide-react";
import { AlertModal } from "@/components/modals/AlertModal";
import { useInventory } from "@/hooks/useInventory";
import { useAuth } from "@/context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";

interface ImportModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ImportModal({ isOpen, onClose }: ImportModalProps) {
    const { addAssets, assets } = useInventory();
    const { user } = useAuth();
    const [importing, setImporting] = useState(false);

    const [summary, setSummary] = useState<{ total: number; success: number } | null>(null);
    const [errors, setErrors] = useState<string[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Conflict Resolution State
    const [conflicts, setConflicts] = useState<Asset[]>([]);
    const [nonConflicts, setNonConflicts] = useState<Asset[]>([]);
    const [showConflictResolution, setShowConflictResolution] = useState(false);

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

    const processFile = (file: File) => {
        if (!user) {
            showAlert("Authentication Error", "You must be logged in to import assets.", "error");
            return;
        }

        setImporting(true);
        setErrors([]); // Clear previous errors
        setSummary(null);

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const XLSX = await import("xlsx");
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: "array" });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);

                const currentErrors: string[] = [];
                const newAssets: Asset[] = [];
                const processedKeys = new Set<string>();

                data.forEach((row: any, index: number) => {
                    const rowNum = index + 2; // Excel row number (1-based + header)
                    const computerNo = row["Computer No."];
                    const serialNo = row["Serial No."];

                    // Required fields check
                    if (!computerNo || !serialNo) {
                        currentErrors.push(`Row ${rowNum}: Missing 'Computer No.' or 'Serial No.'`);
                        return;
                    }

                    const key = `${computerNo}-${serialNo}`;

                    // Check against other rows in this import (file duplicates)
                    if (processedKeys.has(key)) {
                        currentErrors.push(`Row ${rowNum}: Duplicate entry within file (Computer No: ${computerNo}, Serial: ${serialNo})`);
                        return;
                    }
                    processedKeys.add(key);

                    // Helper to parse dates (handles Excel serial numbers and strings)
                    const parseDate = (val: any): string | undefined => {
                        if (!val) return undefined;
                        if (typeof val === 'number') {
                            // Excel serial date to JS Date
                            // Excel base date: Dec 30 1899
                            const date = new Date(Math.round((val - 25569) * 86400 * 1000));
                            return date.toISOString();
                        }
                        // Try parsing string
                        const date = new Date(val);
                        if (!isNaN(date.getTime())) {
                            return date.toISOString();
                        }
                        return undefined;
                    };

                    // Add valid asset (will be upserted in context)
                    newAssets.push({
                        id: crypto.randomUUID(),
                        computerNo,
                        serialNo,
                        brand: row["Brand"] || undefined,
                        model: row["Model"] || undefined,
                        owner: row["Owner"] !== "-" ? row["Owner"] : undefined,
                        empId: row["Emp ID"] !== "-" ? row["Emp ID"] : undefined,
                        department: row["Dept"] !== "-" ? (
                            row["Dept"] === "OMD" ? "OD" :
                                row["Dept"] === "PUR" ? "PU" :
                                    row["Dept"] as Department
                        ) : undefined,
                        status: row["Status"] || "In Stock",
                        purchaseDate: parseDate(row["Purchase Date"]),
                        warrantyExpiry: parseDate(row["Warranty"]),
                        tags: row["Tags"] ? row["Tags"].split(",").map((t: string) => t.trim()) : undefined,
                        remarks: row["Remarks"] || undefined,
                        hdd: row["HDD/SSD"] || undefined,
                        ram: row["RAM"] || undefined,
                        cpu: row["CPU"] || undefined,
                        lastUpdated: new Date().toISOString(),
                        updatedBy: user?.name || "Unknown",
                    });
                });

                if (currentErrors.length > 0) {
                    setErrors(currentErrors);
                    setImporting(false);
                    return;
                }

                if (newAssets.length > 0) {
                    const detectedConflicts: Asset[] = [];
                    const cleanAssets: Asset[] = [];

                    newAssets.forEach(newAsset => {
                        // Check for ANY match (Strict or Partial)
                        const conflict = assets.some(
                            a => a.computerNo === newAsset.computerNo || a.serialNo === newAsset.serialNo
                        );

                        if (conflict) {
                            detectedConflicts.push(newAsset);
                        } else {
                            cleanAssets.push(newAsset);
                        }
                    });

                    if (detectedConflicts.length > 0) {
                        setConflicts(detectedConflicts);
                        setNonConflicts(cleanAssets);
                        setShowConflictResolution(true);
                        setImporting(false);
                        return;
                    }

                    addAssets(newAssets, user?.name || "Unknown", "Import");
                }
                setSummary({ total: data.length, success: newAssets.length });
            } catch (error) {
                console.error("Import failed", error);
                setErrors(["Failed to parse file. Please ensure it is a valid Excel/CSV file matching the template."]);
            } finally {
                setImporting(false);
                if (fileInputRef.current) fileInputRef.current.value = ""; // Reset input
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processFile(file);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) processFile(file);
    };

    const handleDownloadTemplate = async () => {
        const ExcelJS = (await import("exceljs")).default;
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Template");

        worksheet.columns = [
            { header: "Computer No.", key: "computerNo", width: 20 },
            { header: "Serial No.", key: "serialNo", width: 15 },
            { header: "Brand", key: "brand", width: 15 },
            { header: "Model", key: "model", width: 20 },
            { header: "Owner", key: "owner", width: 20 },
            { header: "Emp ID", key: "empId", width: 10 },
            { header: "Dept", key: "dept", width: 15 },
            { header: "Status", key: "status", width: 15 },
            { header: "Purchase Date", key: "purchaseDate", width: 15, style: { numFmt: 'yyyy-mm-dd' } },
            { header: "Warranty", key: "warranty", width: 15, style: { numFmt: 'yyyy-mm-dd' } },
            { header: "Tags", key: "tags", width: 25 },
            { header: "Remarks", key: "remarks", width: 25 },
            { header: "HDD/SSD", key: "hdd", width: 15 },
            { header: "RAM", key: "ram", width: 15 },
            { header: "CPU", key: "cpu", width: 15 },
        ];

        // Add sample row
        worksheet.addRow({
            computerNo: "JTAPNB-250501",
            serialNo: "PF12322",
            empId: "JTC_XXXXX"
        });

        // Add Data Validation (Dropdowns) for rows 2-1000
        const statusOptions = "In Stock,Assigned,Broken,Maintenance";
        const brandOptions = BRANDS.join(",");
        const deptOptions = DEPARTMENTS.join(",");

        for (let i = 2; i <= 1000; i++) {
            // Brand (Column C)
            worksheet.getCell(`C${i}`).dataValidation = {
                type: 'list',
                allowBlank: true,
                formulae: [`"${brandOptions}"`]
            };
            // Dept (Column G)
            worksheet.getCell(`G${i}`).dataValidation = {
                type: 'list',
                allowBlank: true,
                formulae: [`"${deptOptions}"`]
            };
            // Status (Column H)
            worksheet.getCell(`H${i}`).dataValidation = {
                type: 'list',
                allowBlank: true,
                formulae: [`"${statusOptions}"`]
            };
            // HDD/SSD (Column M)
            worksheet.getCell(`M${i}`).dataValidation = {
                type: 'list',
                allowBlank: true,
                formulae: [`"${HDD_OPTIONS.join(",")}"`]
            };
            // RAM (Column N)
            worksheet.getCell(`N${i}`).dataValidation = {
                type: 'list',
                allowBlank: true,
                formulae: [`"${RAM_OPTIONS.join(",")}"`]
            };
        }

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "inventory_import_template.xlsx";
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const handleReplace = () => {
        const allAssets = [...nonConflicts, ...conflicts];
        if (user) {
            addAssets(allAssets, user.name, "Import");
            setSummary({ total: allAssets.length, success: allAssets.length });
            setShowConflictResolution(false);
            setConflicts([]);
            setNonConflicts([]);
        }
    };

    const handleSkip = () => {
        if (user) {
            if (nonConflicts.length > 0) {
                addAssets(nonConflicts, user.name, "Import");
            }
            setSummary({ total: nonConflicts.length + conflicts.length, success: nonConflicts.length });
            setShowConflictResolution(false);
            setConflicts([]);
            setNonConflicts([]);
        }
    };

    const handleClose = () => {
        setErrors([]);
        setSummary(null);
        setConflicts([]);
        setNonConflicts([]);
        setShowConflictResolution(false);
        setImporting(false);
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 h-[100dvh] w-screen touch-none"
                        onClick={handleClose}
                    >
                        <AlertModal
                            isOpen={alertState.isOpen}
                            onClose={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
                            title={alertState.title}
                            message={alertState.message}
                            type={alertState.type}
                        />

                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl max-h-[90dvh] overflow-hidden flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Loading Overlay */}
                            {importing && (
                                <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
                                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600"></div>
                                    <p className="mt-4 font-semibold text-slate-700 animate-pulse">Processing Import...</p>
                                    <p className="text-sm text-slate-500">Please wait while we validate and save.</p>
                                </div>
                            )}

                            {/* Header */}
                            <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 bg-white border-b border-slate-100 z-10">
                                <div>
                                    <h2 className="text-lg sm:text-xl font-bold text-slate-900">Import Assets</h2>
                                    <p className="text-xs sm:text-sm text-slate-500">Bulk add assets using Excel/CSV</p>
                                </div>
                                <button
                                    onClick={handleClose}
                                    className="rounded-full p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors cursor-pointer"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-4 sm:p-6 scrollbar-thin scrollbar-thumb-slate-200">

                                {/* Steps / Guide */}
                                <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                                            <FileSpreadsheet className="h-4 w-4 text-blue-600" />
                                            File Format Guide
                                        </h4>
                                        <button
                                            onClick={handleDownloadTemplate}
                                            className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-sm border border-slate-200 hover:border-blue-300 hover:text-blue-800 transition-all cursor-pointer"
                                        >
                                            <Download className="h-3.5 w-3.5" />
                                            <span className="hidden sm:inline">Download Template</span>
                                            <span className="sm:hidden">Template</span>
                                        </button>
                                    </div>

                                    <div className="grid gap-4 sm:gap-8 md:grid-cols-2">
                                        <div>
                                            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Required</p>
                                            <ul className="space-y-2 text-sm text-slate-600">
                                                <li className="flex items-start gap-2">
                                                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                                                    <span><b>Computer No.</b> (Unique ID)</span>
                                                </li>
                                                <li className="flex items-start gap-2">
                                                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                                                    <span><b>Serial No.</b> (Unique ID)</span>
                                                </li>
                                            </ul>
                                        </div>
                                        <div>
                                            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Flexible Data</p>
                                            <ul className="space-y-2 text-sm text-slate-600">
                                                <li className="flex items-start gap-2">
                                                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
                                                    <span>Supports <b>Dropdowns</b> (Brand, Dept, Status)</span>
                                                </li>
                                                <li className="flex items-start gap-2">
                                                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
                                                    <span>Auto-formats <b>Dates</b> (Purchase, Warranty)</span>
                                                </li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>

                                {/* Main Action Area */}
                                {showConflictResolution ? (
                                    <div className="space-y-6 animate-in fade-in duration-300">
                                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                                            <div className="flex gap-3">
                                                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                                                <div>
                                                    <h3 className="text-sm font-bold text-amber-900">Duplicate Assets Detected</h3>
                                                    <p className="mt-1 text-sm text-amber-700">
                                                        Found <b>{conflicts.length}</b> asset(s) that already exist. How would you like to handle them?
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="max-h-60 overflow-y-auto rounded-2xl border border-slate-200 shadow-sm">
                                            <table className="min-w-full divide-y divide-slate-200">
                                                <thead className="bg-slate-50/80 backdrop-blur supports-[backdrop-filter]:bg-slate-50/80 sticky top-0 z-10">
                                                    <tr>
                                                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Computer No.</th>
                                                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Serial No.</th>
                                                        <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-slate-200">
                                                    {conflicts.map((asset, idx) => (
                                                        <tr key={idx} className="hover:bg-slate-50/50">
                                                            <td className="px-4 py-2.5 text-sm font-medium text-slate-900">{asset.computerNo}</td>
                                                            <td className="px-4 py-2.5 text-sm text-slate-500">{asset.serialNo}</td>
                                                            <td className="px-4 py-2.5 text-sm text-right text-amber-600 font-medium">Duplicate</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 pt-2">
                                            <button
                                                onClick={handleSkip}
                                                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm cursor-pointer"
                                            >
                                                Skip Duplicates ({conflicts.length})
                                            </button>
                                            <button
                                                onClick={handleReplace}
                                                className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700 hover:shadow-blue-500/40 transition-all cursor-pointer"
                                            >
                                                Replace All
                                            </button>
                                        </div>
                                    </div>
                                ) : errors.length > 0 ? (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                                        <div className="rounded-2xl bg-red-50 p-4 border border-red-100">
                                            <div className="flex">
                                                <div className="flex-shrink-0">
                                                    <X className="h-5 w-5 text-red-500" />
                                                </div>
                                                <div className="ml-3">
                                                    <h3 className="text-sm font-bold text-red-800">Import Failed</h3>
                                                    <div className="mt-2 text-sm text-red-700">
                                                        <ul className="list-disc space-y-1 pl-5">
                                                            {errors.slice(0, 5).map((error, index) => (
                                                                <li key={index}>{error}</li>
                                                            ))}
                                                            {errors.length > 5 && (
                                                                <li>...and {errors.length - 5} more errors</li>
                                                            )}
                                                        </ul>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setErrors([])}
                                            className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-lg hover:bg-slate-800 transition-all cursor-pointer"
                                        >
                                            Try Again
                                        </button>
                                    </div>
                                ) : !summary ? (
                                    <div
                                        className={`group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all duration-300 ${isDragging
                                            ? "border-blue-500 bg-blue-50/50 scale-[0.99]"
                                            : "border-slate-300 bg-white hover:border-blue-400 hover:bg-slate-50"
                                            } h-64`}
                                        onClick={() => {
                                            if (!user) {
                                                showAlert("Authentication Error", "You must be logged in to import assets.", "error");
                                                return;
                                            }
                                            fileInputRef.current?.click();
                                        }}
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        onDrop={handleDrop}
                                    >
                                        <div className="mb-4 rounded-full bg-blue-50 p-4 group-hover:bg-blue-100 transition-colors">
                                            <Upload className={`h-8 w-8 ${isDragging ? "text-blue-600" : "text-blue-500"}`} />
                                        </div>
                                        <p className="text-lg font-semibold text-slate-700 group-hover:text-blue-700 transition-colors">
                                            {isDragging ? "Drop file now" : "Click to upload"}
                                        </p>
                                        <p className="mt-1 text-sm text-slate-500">
                                            or drag and drop Excel/CSV file here
                                        </p>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept=".xlsx, .xls, .csv"
                                            className="hidden"
                                            onChange={handleFileUpload}
                                        />
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-8 text-center animate-in zoom-in duration-300">
                                        <div className="mb-4 rounded-full bg-green-100 p-4 shadow-sm">
                                            <Save className="h-8 w-8 text-green-600" />
                                        </div>
                                        <h3 className="text-xl font-bold text-slate-900">Import Successful!</h3>
                                        <p className="mx-auto mt-2 max-w-xs text-sm text-slate-500">
                                            Successfully processed <b className="text-slate-900">{summary.success}</b> records.
                                            Your inventory has been updated.
                                        </p>
                                        <button
                                            onClick={handleClose}
                                            className="mt-8 w-full max-w-xs rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-[1.02] transition-all cursor-pointer"
                                        >
                                            Done
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            {!summary && !showConflictResolution && errors.length === 0 && (
                                <div className="space-y-4 p-4 sm:p-6 border-t border-slate-100 bg-slate-50/50 z-10 shrink-0">
                                    <div className="flex items-start gap-3 rounded-lg bg-blue-50/80 p-3 text-sm text-blue-800">
                                        <AlertCircle className="h-5 w-5 shrink-0 text-blue-600" />
                                        <div>
                                            <p className="font-medium">Person In Charge: {user?.name}</p>
                                            <p className="text-xs opacity-80 mt-0.5">This import will be logged under your account.</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
