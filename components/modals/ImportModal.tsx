import { useState, useRef } from "react";
import { Asset, Department, DEPARTMENTS, BRANDS, HDD_OPTIONS, RAM_OPTIONS } from "@/lib/types";
import { X, Upload, FileSpreadsheet, Info, AlertTriangle, Download } from "lucide-react";
// import * as XLSX from "xlsx"; // Removed static import
import { AlertModal } from "@/components/modals/AlertModal";
import { useInventory } from "@/hooks/useInventory";
import { useAuth } from "@/context/AuthContext";

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

    if (!isOpen) return null;

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
                        purchaseDate: row["Purchase Date"] || undefined,
                        warrantyExpiry: row["Warranty"] || undefined,
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

                    addAssets(newAssets, user?.name || "Unknown");
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
            { header: "Purchase Date", key: "purchaseDate", width: 15 },
            { header: "Warranty", key: "warranty", width: 15 },
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
        // Import ALL assets (both conflicts and non-conflicts)
        // The context's addAssets logic already handles upserting (updating if exists)
        const allAssets = [...nonConflicts, ...conflicts];
        if (user) {
            addAssets(allAssets, user.name);
            setSummary({ total: allAssets.length, success: allAssets.length });
            setShowConflictResolution(false);
            setConflicts([]);
            setNonConflicts([]);
        }
    };

    const handleSkip = () => {
        // Import ONLY non-conflicting assets
        if (user) {
            if (nonConflicts.length > 0) {
                addAssets(nonConflicts, user.name);
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
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={handleClose}>
            <AlertModal
                isOpen={alertState.isOpen}
                onClose={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
                title={alertState.title}
                message={alertState.message}
                type={alertState.type}
            />
            <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold text-slate-800">Import Assets</h2>
                    </div>
                    <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="mb-4 rounded-md border border-blue-100 bg-blue-50/50 p-4 text-sm animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-blue-900 flex items-center gap-2">
                            <FileSpreadsheet className="h-4 w-4" />
                            File Format Guide
                        </h4>
                        <button
                            onClick={handleDownloadTemplate}
                            className="flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-xs font-medium text-blue-700 shadow-sm border border-blue-200 hover:bg-blue-50 transition-all cursor-pointer"
                            title="Download Excel Template"
                        >
                            <Download className="h-3.5 w-3.5" />
                            Template
                        </button>
                    </div>
                    <div className="grid gap-6 sm:grid-cols-2">
                        <div>
                            <p className="mb-2 font-medium text-slate-700 border-b border-blue-100 pb-1">Required Columns</p>
                            <ul className="list-disc pl-4 text-slate-600 space-y-1 text-xs">
                                <li><span className="font-mono font-semibold text-slate-800">Computer No.</span> (Unique ID)</li>
                                <li><span className="font-mono font-semibold text-slate-800">Serial No.</span> (Unique ID)</li>
                            </ul>
                        </div>
                        <div>
                            <p className="mb-2 font-medium text-slate-700 border-b border-blue-100 pb-1">Optional Columns</p>
                            <ul className="list-disc pl-4 text-slate-600 space-y-1 text-xs">
                                <li>
                                    <span className="font-semibold text-slate-800">Dropdowns Available:</span>
                                    <br />
                                    Brand, Dept, Status
                                </li>
                                <li>
                                    <span className="font-semibold text-slate-800">Text Fields:</span>
                                    <br />
                                    Model, Owner, Emp ID, Tags, Remarks, HDD/SSD, RAM, CPU
                                </li>
                                <li>
                                    <span className="font-semibold text-slate-800">Dates:</span>
                                    <br />
                                    Purchase Date, Warranty
                                </li>
                            </ul>
                        </div>
                    </div>
                    <div className="mt-4 rounded bg-white p-3 text-xs text-slate-500 border border-blue-100 shadow-sm">
                        <p className="flex gap-2">
                            <span>💡</span>
                            <span>
                                <span className="font-medium text-slate-700">Tip:</span> Download the template below. It includes <b>dropdown menus</b> for Brand, Department, and Status to help you select valid options.
                            </span>
                        </p>
                    </div>
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Person In Charge</label>
                    <div className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700">
                        {user?.name}
                    </div>
                </div>

                {showConflictResolution ? (
                    <div className="space-y-4 animate-in fade-in duration-300">
                        <div className="rounded-md bg-amber-50 p-4 border border-amber-200">
                            <div className="flex gap-3">
                                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                                <div>
                                    <h3 className="text-sm font-medium text-amber-800">Duplicate Assets Detected</h3>
                                    <p className="mt-1 text-sm text-amber-700">
                                        Found {conflicts.length} asset(s) that already exist in the inventory.
                                        Do you want to replace them with the new data?
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="max-h-48 overflow-y-auto overflow-x-auto rounded-md border border-slate-200">
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-slate-50 sticky top-0">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Computer No.</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Serial No.</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-200">
                                    {conflicts.map((asset, idx) => (
                                        <tr key={idx}>
                                            <td className="px-4 py-2 text-sm text-slate-900">{asset.computerNo}</td>
                                            <td className="px-4 py-2 text-sm text-slate-500">{asset.serialNo}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                            <button
                                onClick={handleClose}
                                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                            >
                                Cancel Import
                            </button>
                            <button
                                onClick={handleSkip}
                                className="rounded-md bg-slate-600 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 cursor-pointer"
                            >
                                Skip Duplicates
                            </button>
                            <button
                                onClick={handleReplace}
                                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 cursor-pointer"
                            >
                                Replace All
                            </button>
                        </div>
                    </div>
                ) : errors.length > 0 ? (
                    <div className="space-y-4">
                        <div className="rounded-md bg-red-50 p-4">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <X className="h-5 w-5 text-red-400" aria-hidden="true" />
                                </div>
                                <div className="ml-3">
                                    <h3 className="text-sm font-medium text-red-800">Import Failed</h3>
                                    <div className="mt-2 text-sm text-red-700">
                                        <ul role="list" className="list-disc space-y-1 pl-5">
                                            {errors.slice(0, 10).map((error, index) => (
                                                <li key={index}>{error}</li>
                                            ))}
                                            {errors.length > 10 && (
                                                <li>...and {errors.length - 10} more errors</li>
                                            )}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <button
                                onClick={() => setErrors([])}
                                className="rounded-md bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 cursor-pointer"
                            >
                                Try Again
                            </button>
                        </div>
                    </div>
                ) : !summary ? (
                    <div className="space-y-4">
                        <div className="flex justify-end">
                            {/* Template button moved to header */}
                        </div>
                        <div
                            className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${isDragging
                                ? "border-blue-500 bg-blue-50"
                                : "border-slate-300 bg-slate-50 hover:bg-slate-100"
                                }`}
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
                            <FileSpreadsheet className={`mb-2 h-10 w-10 ${isDragging ? "text-blue-500" : "text-slate-400"}`} />
                            <p className={`text-sm font-medium ${isDragging ? "text-blue-700" : "text-slate-600"}`}>
                                {isDragging ? "Drop file here" : "Click to upload or drag & drop"}
                            </p>
                            <p className="text-xs text-slate-500">
                                Required: Computer No., Serial No. <br />
                                Existing items will be updated.
                            </p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".xlsx, .xls, .csv"
                                className="hidden"
                                onChange={handleFileUpload}
                            />
                        </div>
                        {importing && <p className="text-center text-sm text-blue-600">Importing...</p>}
                    </div>
                ) : (
                    <div className="space-y-4 text-center">
                        <div className="rounded-full bg-green-100 p-3 inline-block">
                            <Upload className="h-6 w-6 text-green-600" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-900">Import Complete</h3>
                        <p className="text-slate-500">
                            Successfully processed {summary.success} records (including updates).
                        </p>
                        <button
                            onClick={handleClose}
                            className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 cursor-pointer"
                        >
                            Done
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
