"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Asset, AuditLog } from "@/lib/types";
import { useInventory } from "@/hooks/useInventory";
import { useAuth } from "@/context/AuthContext";
import { ScanBarcode, CheckCircle, AlertCircle, RefreshCw, Download, Camera, X, Upload, User } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { AlertModal } from "@/components/modals/AlertModal";
import { motion } from "framer-motion";
import { AuditSkeleton } from "@/components/skeletons/AppSkeletons";

export default function AuditPage() {
    const { assets, loading, saveAuditLog } = useInventory();
    const { user } = useAuth();
    const [scannedIds, setScannedIds] = useState<Set<string>>(new Set());
    const [currentInput, setCurrentInput] = useState("");
    const [auditStatus, setAuditStatus] = useState<"Idle" | "In Progress" | "Completed">("Idle");
    const inputRef = useRef<HTMLInputElement>(null);

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

    // Scanner State
    const [isScanning, setIsScanning] = useState(false);
    const scannerRef = useRef<Html5Qrcode | null>(null);

    // Filter assets to only "In Stock" for audit
    const auditAssets = useMemo(() => assets.filter((a: Asset) => a.status === "In Stock"), [assets]);
    const totalAssets = auditAssets.length;
    const scannedCount = scannedIds.size;
    const missingCount = totalAssets - scannedCount;

    const scannedAssetsList = useMemo(() => auditAssets.filter((a: Asset) => scannedIds.has(a.id)), [auditAssets, scannedIds]);
    const missingAssetsList = useMemo(() => auditAssets.filter((a: Asset) => !scannedIds.has(a.id)), [auditAssets, scannedIds]);

    // Scanner Input Logic
    useEffect(() => {
        if (auditStatus !== "In Progress" || isScanning) return;

        let buffer = "";
        let lastKeyTime = Date.now();

        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if focus is on an input or textarea (though we disabled the main one)
            const target = e.target as HTMLElement;
            if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
                // If it's our readOnly input, we still want to capture, but browser might block typing.
                // Since we made it readOnly, standard typing is blocked, but keydown still fires.
                // However, we should be careful not to block other inputs if we add them later.
                // For now, we only have one input which is readOnly.
            }

            const currentTime = Date.now();
            const timeDiff = currentTime - lastKeyTime;
            lastKeyTime = currentTime;

            // Scanner usually sends characters very fast (< 50ms)
            // If timeDiff is large, it's likely manual typing or a new scan sequence
            if (timeDiff > 100) {
                buffer = "";
            }

            if (e.key === "Enter") {
                if (buffer.length > 0) {
                    handleProcessScan(buffer);
                    setCurrentInput(buffer); // Show last scanned
                    buffer = "";
                }
            } else if (e.key.length === 1) {
                // Only append printable characters
                buffer += e.key;
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [auditStatus, isScanning, auditAssets]); // Added auditAssets to dependency if handleProcessScan uses it (it does via closure, but best to be safe or use a ref)

    // We don't need the auto-focus effect anymore since we listen globally
    // But we can keep the ref for potential future use or remove it.
    // Removing the old useEffect that focused inputRef.

    // Initialize scanner when isScanning becomes true
    useEffect(() => {
        let scanner: Html5Qrcode | null = null;

        if (isScanning) {
            // Dynamically import to avoid SSR issues
            import("html5-qrcode").then(({ Html5Qrcode }) => {
                scanner = new Html5Qrcode("audit-reader");
                scannerRef.current = scanner;

                const config = { fps: 10, qrbox: { width: 250, height: 250 } };

                // Prefer back camera (environment)
                scanner.start(
                    { facingMode: "environment" },
                    config,
                    (decodedText) => {
                        handleProcessScan(decodedText);
                        // Don't stop scanning immediately to allow rapid scanning, 
                        // or stop if preferred. Let's keep scanning for audit flow.
                        // But for now, let's stop to give feedback.
                        setIsScanning(false);
                        scanner?.stop().then(() => {
                            scanner?.clear();
                        }).catch(console.error);
                    },
                    (errorMessage) => {
                        // console.warn(errorMessage);
                    }
                ).catch((err) => {
                    console.error("Error starting scanner", err);
                    let errorMessage = "Could not start camera.";
                    let errorTitle = "Camera Error";

                    if (err.name === "NotAllowedError" || err.toString().includes("Permission dismissed")) {
                        errorTitle = "Permission Denied";
                        errorMessage = "Camera access was denied. Please enable camera permissions in your browser settings and reload the page.";
                    } else if (err.name === "NotFoundError") {
                        errorMessage = "No camera found on this device.";
                    } else if (err.name === "NotReadableError") {
                        errorMessage = "Camera is currently in use by another application.";
                    }

                    showAlert(errorTitle, errorMessage, "error");
                    setIsScanning(false);
                });
            });
        }

        // Cleanup function
        return () => {
            if (scanner && scanner.isScanning) {
                scanner.stop().then(() => scanner?.clear()).catch(console.error);
            }
        };
    }, [isScanning]);

    const handleStopScanning = () => {
        if (scannerRef.current) {
            scannerRef.current.stop().then(() => {
                scannerRef.current?.clear();
                setIsScanning(false);
            }).catch((err) => {
                console.error("Failed to stop scanner", err);
                setIsScanning(false);
            });
        } else {
            setIsScanning(false);
        }
    };

    const handleStartClick = () => {
        if (auditAssets.length === 0) {
            showAlert("Cannot Start Audit", "No asset found", "warning");
            return;
        }
        if (!user) {
            showAlert("Authentication Required", "You must be logged in to start an audit.", "error");
            return;
        }
        startAudit();
    };

    const startAudit = () => {
        setScannedIds(new Set());
        setAuditStatus("In Progress");
    };

    const [confirmAction, setConfirmAction] = useState<"Finish" | "Cancel" | null>(null);

    const handleCancelAuditClick = () => {
        setConfirmAction("Cancel");
    };

    const handleStopAuditClick = () => {
        setConfirmAction("Finish");
    };

    const confirmActionHandler = () => {
        if (confirmAction === "Cancel") {
            setAuditStatus("Idle");
            setScannedIds(new Set());
        } else if (confirmAction === "Finish") {
            const missingIds = auditAssets
                .filter(a => !scannedIds.has(a.id))
                .map(a => a.id);

            const log: AuditLog = {
                id: crypto.randomUUID(),
                date: new Date().toISOString(),
                totalAssets,
                scannedCount,
                missingCount,
                scannedIds: Array.from(scannedIds),
                missingIds,
                status: "Completed",
                auditedBy: user?.name || "Unknown",
                verificationStatus: "Pending",
            };
            saveAuditLog(log);
            setAuditStatus("Completed");
            setScannedIds(new Set());
        }
        setConfirmAction(null);
    };

    const handleProcessScan = (code: string) => {
        // Check against auditAssets (In Stock only)
        const asset = auditAssets.find(
            (a) =>
                a.computerNo.toLowerCase() === code.toLowerCase() ||
                a.serialNo.toLowerCase() === code.toLowerCase()
        );

        if (asset) {
            setScannedIds((prev) => {
                const newSet = new Set(prev);
                if (newSet.has(asset.id)) {
                    showAlert("Already Scanned", `Asset ${asset.computerNo} already scanned.`, "warning");
                    return prev;
                }
                newSet.add(asset.id);
                return newSet;
            });
            // Optional: Play success sound
        } else {
            // Check if it exists but not In Stock
            const exists = assets.find(
                (a) =>
                    a.computerNo.toLowerCase() === code.toLowerCase() ||
                    a.serialNo.toLowerCase() === code.toLowerCase()
            );

            if (exists) {
                showAlert("Wrong Status", `Asset found but status is '${exists.status}', not 'In Stock'.`, "warning");
            } else {
                showAlert("Not Found", `Asset '${code}' not found. Please verify that the asset exists and is 'In Stock'.`, "error");
            }
        }
    };

    const handleScan = (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentInput) return;
        handleProcessScan(currentInput);
        setCurrentInput("");
    };



    if (loading) return <AuditSkeleton />;


    return (

        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6 pb-20 md:pb-0 font-inter"
        >
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
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Stock Audit</h1>
                    <p className="text-sm text-slate-500 mt-1">Verify physical assets against the system inventory.</p>
                </div>

                {auditStatus === "Idle" || auditStatus === "Completed" ? (
                    <button
                        onClick={handleStartClick}
                        className="group flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-500/20 transition-all hover:shadow-violet-500/40 hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <ScanBarcode className="h-4 w-4 transition-transform group-hover:scale-110" />
                        <span>Start New Audit</span>
                    </button>
                ) : (
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm w-full md:w-auto">
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Auditor</span>
                            <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                    <User className="h-4 w-4" />
                                </div>
                                <span className="text-sm font-bold text-slate-900">{user?.name || "Unknown"}</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 w-full md:w-auto md:flex md:items-center">
                            <button
                                onClick={handleCancelAuditClick}
                                className="flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-100 transition-colors shadow-sm active:scale-95"
                            >
                                <X className="h-4 w-4" />
                                <span>Cancel</span>
                            </button>
                            <button
                                onClick={handleStopAuditClick}
                                className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition-all hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98]"
                            >
                                <CheckCircle className="h-4 w-4" />
                                <span className="whitespace-nowrap">Finish & Save</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Scanner UI Overlay */}
            {isScanning && (
                <div className="fixed inset-0 z-50 flex flex-col bg-black animate-in fade-in duration-200">
                    <div className="flex items-center justify-between bg-black/80 backdrop-blur-md p-4 text-white z-20">
                        <h3 className="text-lg font-semibold">Scan Asset Tag</h3>
                        <button
                            onClick={handleStopScanning}
                            className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors cursor-pointer"
                        >
                            <X className="h-6 w-6" />
                        </button>
                    </div>
                    <div className="flex-1 flex items-center justify-center bg-black relative">
                        <div id="audit-reader" className="w-full max-w-md overflow-hidden rounded-xl border-2 border-white/20 shadow-2xl"></div>
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                            <div className="w-64 h-64 border-2 border-white/50 rounded-2xl"></div>
                        </div>
                    </div>
                    <div className="p-8 text-center text-white/70 bg-black/80 backdrop-blur-md z-20">
                        <p className="text-sm font-medium">Point camera at an asset tag or QR code</p>
                    </div>
                </div>
            )}

            {
                confirmAction && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl scale-100 transform transition-all">
                            <h2 className="mb-2 text-xl font-bold text-slate-900">
                                {confirmAction === "Finish" ? "Finish Audit?" : "Cancel Audit?"}
                            </h2>
                            <p className="mb-6 text-sm text-slate-600">
                                {confirmAction === "Finish"
                                    ? "Are you sure you want to finish this audit? This will save the current results to history."
                                    : "Are you sure you want to cancel? All progress will be lost."}
                            </p>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setConfirmAction(null)}
                                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                                >
                                    Go Back
                                </button>
                                <button
                                    onClick={confirmActionHandler}
                                    className={`rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors cursor-pointer ${confirmAction === "Finish" ? "bg-blue-600 hover:bg-blue-700" : "bg-red-600 hover:bg-red-700"
                                        } `}
                                >
                                    Yes, {confirmAction}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {
                auditStatus === "In Progress" && (
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4 text-center">
                            <div className="rounded-xl bg-blue-50/50 p-6 ring-1 ring-blue-100">
                                <div className="text-3xl font-black text-blue-600 tracking-tight">{totalAssets}</div>
                                <div className="mt-1 text-xs font-bold text-blue-400 uppercase tracking-widest">Total Stock</div>
                            </div>
                            <div className="rounded-xl bg-emerald-50/50 p-6 ring-1 ring-emerald-100">
                                <div className="text-3xl font-black text-emerald-600 tracking-tight">{scannedCount}</div>
                                <div className="mt-1 text-xs font-bold text-emerald-400 uppercase tracking-widest">
                                    Found ({totalAssets > 0 ? Math.round((scannedCount / totalAssets) * 100) : 0}%)
                                </div>
                            </div>
                            <div className="rounded-xl bg-rose-50/50 p-6 ring-1 ring-rose-100">
                                <div className="text-3xl font-black text-rose-600 tracking-tight">{missingCount}</div>
                                <div className="mt-1 text-xs font-bold text-rose-400 uppercase tracking-widest">
                                    Missing ({totalAssets > 0 ? Math.round((missingCount / totalAssets) * 100) : 0}%)
                                </div>
                            </div>
                        </div>

                        <div className="mb-2">
                            <label className="mb-2 block text-sm font-bold text-slate-700 hidden md:block">
                                Quick Scan
                            </label>

                            {/* Desktop View */}
                            <div className="hidden md:flex gap-2">
                                <div className="relative flex-1">
                                    <ScanBarcode className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        readOnly={true}
                                        value={currentInput}
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-not-allowed"
                                        placeholder="Scan barcode or type and press Enter..."
                                    />
                                    {currentInput && (
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                                            Last Scanned
                                        </div>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsScanning(true)}
                                    className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white hover:bg-slate-800 shadow-sm transition-all cursor-pointer"
                                    title="Open Camera"
                                >
                                    <Camera className="h-4 w-4" />
                                    <span>Camera</span>
                                </button>
                            </div>

                            {/* Mobile View */}
                            <div className="md:hidden">
                                <button
                                    type="button"
                                    onClick={() => setIsScanning(true)}
                                    className="group flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 py-4 text-white shadow-lg shadow-blue-500/25 active:scale-[0.98] transition-all cursor-pointer"
                                >
                                    <div className="rounded-full bg-white/20 p-2 group-hover:bg-white/30 transition-colors">
                                        <Camera className="h-6 w-6" />
                                    </div>
                                    <span className="text-lg font-bold">Tap to Scan</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }


            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Scanned List */}
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col h-[500px]">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center">
                                <CheckCircle className="h-4 w-4 text-emerald-600" />
                            </div>
                            <h2 className="font-bold text-slate-900">Scanned Assets</h2>
                        </div>
                        <span className="text-xs font-bold bg-white border border-slate-200 px-2 py-1 rounded-lg text-slate-500">
                            {scannedAssetsList.length} Items
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-0">
                        {/* Mobile List */}
                        <div className="md:hidden divide-y divide-slate-100">
                            {scannedAssetsList.map((asset) => (
                                <div key={asset.id} className="p-4 bg-white">
                                    <div className="flex justify-between items-start mb-1">
                                        <div className="font-bold text-slate-900">{asset.computerNo}</div>
                                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${asset.status === "In Stock" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                                            }`}>
                                            {asset.status}
                                        </span>
                                    </div>
                                    <div className="text-xs text-slate-500 mb-1">{asset.brand} {asset.model}</div>
                                    <div className="text-xs text-slate-400 font-mono">S/N: {asset.serialNo}</div>
                                </div>
                            ))}
                            {scannedAssetsList.length === 0 && (
                                <div className="p-8 text-center text-sm text-slate-500 italic">No assets scanned yet.</div>
                            )}
                        </div>

                        {/* Desktop Table */}
                        <table className="hidden min-w-full divide-y divide-slate-100 md:table">
                            <thead className="bg-slate-50/80 backdrop-blur supports-[backdrop-filter]:bg-slate-50/80 sticky top-0 z-10">
                                <tr>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Asset</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Details</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 bg-white">
                                {scannedAssetsList.map((asset) => (
                                    <tr key={asset.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-3">
                                            <div className="font-semibold text-slate-900 text-sm">{asset.computerNo}</div>
                                            <div className="text-xs text-slate-500 font-mono">{asset.serialNo}</div>
                                        </td>
                                        <td className="px-6 py-3">
                                            <div className="text-sm text-slate-700">{asset.brand} {asset.model}</div>
                                            <div className="text-xs text-slate-400">{asset.department || "No Dept"}</div>
                                        </td>
                                        <td className="px-6 py-3">
                                            <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 ring-1 ring-emerald-600/10">
                                                {asset.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {scannedAssetsList.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-12 text-center text-sm text-slate-400 italic">
                                            Ready to scan...
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Missing List */}
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col h-[500px]">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-rose-100 flex items-center justify-center">
                                <AlertCircle className="h-4 w-4 text-rose-600" />
                            </div>
                            <h2 className="font-bold text-slate-900">Missing Assets</h2>
                        </div>
                        <span className="text-xs font-bold bg-white border border-slate-200 px-2 py-1 rounded-lg text-slate-500">
                            {missingAssetsList.length} Items
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-0">
                        {/* Mobile List */}
                        <div className="md:hidden divide-y divide-slate-100">
                            {missingAssetsList.map((asset) => (
                                <div key={asset.id} className="p-4 bg-white hover:bg-rose-50/30 transition-colors">
                                    <div className="flex justify-between items-start mb-1">
                                        <div className="font-bold text-slate-900">{asset.computerNo}</div>
                                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide border ${asset.status === "In Stock" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                                asset.status === "Assigned" || asset.status === "In Use" ? "bg-blue-50 text-blue-700 border-blue-200" :
                                                    asset.status === "Broken" || asset.status === "Resign" ? "bg-red-50 text-red-700 border-red-200" :
                                                        "bg-yellow-50 text-yellow-700 border-yellow-200"
                                            }`}>
                                            {asset.status}
                                        </span>
                                    </div>
                                    <div className="text-xs text-slate-500 mb-1">{asset.brand} {asset.model}</div>
                                    <div className="text-xs text-slate-400 font-mono">S/N: {asset.serialNo}</div>
                                </div>
                            ))}
                        </div>

                        {/* Desktop Table */}
                        <table className="hidden min-w-full divide-y divide-slate-100 md:table">
                            <thead className="bg-slate-50/80 backdrop-blur supports-[backdrop-filter]:bg-slate-50/80 sticky top-0 z-10">
                                <tr>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Asset</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Details</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 bg-white">
                                {missingAssetsList.map((asset) => (
                                    <tr key={asset.id} className="hover:bg-rose-50/10 transition-colors">
                                        <td className="px-6 py-3">
                                            <div className="font-semibold text-slate-900 text-sm">{asset.computerNo}</div>
                                            <div className="text-xs text-slate-500 font-mono">{asset.serialNo}</div>
                                        </td>
                                        <td className="px-6 py-3">
                                            <div className="text-sm text-slate-700">{asset.brand} {asset.model}</div>
                                            <div className="text-xs text-slate-400">{asset.department || "No Dept"}</div>
                                        </td>
                                        <td className="px-6 py-3">
                                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold border ${asset.status === "In Stock" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                                asset.status === "Assigned" || asset.status === "In Use" ? "bg-blue-50 text-blue-700 border-blue-200" :
                                                    asset.status === "Broken" || asset.status === "Resign" ? "bg-red-50 text-red-700 border-red-200" :
                                                        "bg-yellow-50 text-yellow-700 border-yellow-200"
                                                }`}>
                                                {asset.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
