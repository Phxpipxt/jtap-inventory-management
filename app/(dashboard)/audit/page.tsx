"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Asset, AuditLog } from "@/lib/types";
import { useInventory } from "@/hooks/useInventory";
import { useAuth } from "@/context/AuthContext";
import { ScanBarcode, CheckCircle, AlertCircle, RefreshCw, Download, Camera, X, Upload } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { AlertModal } from "@/components/modals/AlertModal";

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
                    showAlert("Camera Error", "Could not start camera. Please ensure camera permissions are granted.", "error");
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

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="space-y-6 pb-20 md:pb-0">
            <AlertModal
                isOpen={alertState.isOpen}
                onClose={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
                title={alertState.title}
                message={alertState.message}
                type={alertState.type}
            />
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <h1 className="text-2xl font-bold text-slate-800">Asset Audit</h1>
                {auditStatus === "Idle" || auditStatus === "Completed" ? (
                    <button
                        onClick={handleStartClick}
                        className="flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-3 text-base font-medium text-white hover:bg-blue-700 md:w-auto md:py-2 md:text-sm cursor-pointer"
                        title="Start a New Audit Session"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Start New Audit
                    </button>
                ) : (
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
                        <span className="text-sm font-medium text-slate-600">Auditor: {user?.name || "Unknown"}</span>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={handleCancelAuditClick}
                                className="rounded-md bg-slate-200 px-4 py-2 text-slate-700 hover:bg-slate-300 cursor-pointer"
                                title="Cancel Current Audit"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleStopAuditClick}
                                className="rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700 cursor-pointer"
                                title="Finish and Save Audit"
                            >
                                Finish Audit
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Scanner UI Overlay */}
            {isScanning && (
                <div className="fixed inset-0 z-50 flex flex-col bg-black">
                    <div className="flex items-center justify-between bg-black p-4 text-white">
                        <h3 className="text-lg font-semibold">Scan Asset Tag</h3>
                        <button
                            onClick={handleStopScanning}
                            className="rounded-full bg-white/20 p-2 text-white hover:bg-white/30 cursor-pointer"
                            title="Close Scanner"
                        >
                            <X className="h-6 w-6" />
                        </button>
                    </div>
                    <div className="flex-1 flex items-center justify-center bg-black">
                        <div id="audit-reader" className="w-full max-w-md overflow-hidden rounded-lg"></div>
                    </div>
                    <div className="p-8 text-center text-white/70">
                        <p>Point camera at an asset tag or QR code</p>
                    </div>
                </div>
            )}



            {/* Confirmation Modal */}
            {
                confirmAction && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                        <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
                            <h2 className="mb-4 text-xl font-bold text-slate-900">
                                {confirmAction === "Finish" ? "Finish Audit?" : "Cancel Audit?"}
                            </h2>
                            <p className="mb-6 text-slate-600">
                                {confirmAction === "Finish"
                                    ? "Are you sure you want to finish this audit? This will save the current results to history."
                                    : "Are you sure you want to cancel? All progress will be lost."}
                            </p>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setConfirmAction(null)}
                                    className="rounded-md border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50 cursor-pointer"
                                >
                                    No, Go Back
                                </button>
                                <button
                                    onClick={confirmActionHandler}
                                    className={`rounded-md px-4 py-2 text-white cursor-pointer ${confirmAction === "Finish" ? "bg-blue-600 hover:bg-blue-700" : "bg-red-600 hover:bg-red-700"
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
                    <div className="rounded-lg bg-white p-4 shadow-sm md:p-6">
                        <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4 text-center">
                            <div className="rounded-xl bg-blue-50 p-4 ring-1 ring-blue-100 md:p-6">
                                <div className="text-2xl font-bold text-blue-700 md:text-3xl">{totalAssets}</div>
                                <div className="mt-1 text-sm font-bold text-blue-600 md:text-base">Total Assets (In Stock)</div>
                            </div>
                            <div className="rounded-xl bg-green-50 p-4 ring-1 ring-green-100 md:p-6">
                                <div className="text-2xl font-bold text-green-700 md:text-3xl">{scannedCount}</div>
                                <div className="mt-1 text-sm font-bold text-green-600 md:text-base">
                                    Found ({totalAssets > 0 ? Math.round((scannedCount / totalAssets) * 100) : 0}%)
                                </div>
                            </div>
                            <div className="rounded-xl bg-red-50 p-4 ring-1 ring-red-100 md:p-6">
                                <div className="text-2xl font-bold text-red-700 md:text-3xl">{missingCount}</div>
                                <div className="mt-1 text-sm font-bold text-red-600 md:text-base">
                                    Missing ({totalAssets > 0 ? Math.round((missingCount / totalAssets) * 100) : 0}%)
                                </div>
                            </div>
                        </div>

                        <div className="mb-2">
                            <label className="mb-2 block text-sm font-medium text-slate-700 md:block hidden">
                                Scan Asset Tag or Serial No.
                            </label>

                            {/* Desktop View: Input Field + Scanner Gun Support */}
                            <div className="hidden md:flex gap-2">
                                <div className="relative flex-1">
                                    <ScanBarcode className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        value={currentInput}
                                        onChange={(e) => setCurrentInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                handleScan(e);
                                            }
                                        }}
                                        className="w-full rounded-md border border-slate-300 bg-white pl-10 pr-4 py-3 text-base text-black focus:border-blue-500 focus:outline-none md:py-2 md:text-sm"
                                        placeholder="Scan or Type Asset Tag"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsScanning(true)}
                                    className="flex items-center justify-center rounded-md bg-slate-100 px-4 text-slate-700 hover:bg-slate-200 cursor-pointer"
                                    title="Open Camera Scanner"
                                >
                                    <Camera className="h-6 w-6" />
                                </button>
                            </div>

                            {/* Mobile View: Large Camera Button Only */}
                            <div className="md:hidden">
                                <button
                                    type="button"
                                    onClick={() => setIsScanning(true)}
                                    className="group flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 py-4 text-white shadow-md active:scale-[0.98] active:shadow-sm transition-all cursor-pointer"
                                >
                                    <div className="rounded-full bg-white/20 p-2 group-hover:bg-white/30 transition-colors">
                                        <Camera className="h-6 w-6" />
                                    </div>
                                    <span className="text-base font-semibold">Tap to Scan Camera</span>
                                </button>
                            </div>

                            <p className="mt-2 text-xs text-slate-500 hidden md:block">
                                Please use a barcode scanner or the camera button.
                            </p>
                        </div>
                    </div>
                )
            }


            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="rounded-lg bg-white p-4 shadow-sm md:p-6">
                    <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-green-700">
                        <CheckCircle className="h-5 w-5" />
                        Scanned Assets
                    </h2>
                    <div className="max-h-96 overflow-y-auto">
                        {/* Mobile List View */}
                        <div className="md:hidden space-y-2">
                            {scannedAssetsList
                                .map((asset) => (
                                    <div key={asset.id} className="rounded border border-green-100 bg-green-50 p-3 text-sm">
                                        <div className="font-bold text-slate-900 truncate">{asset.computerNo}</div>
                                        <div className="text-xs text-slate-500">S/N : {asset.serialNo}</div>
                                        <div className="text-xs text-slate-500">{asset.brand} {asset.model}</div>
                                        <div className="text-xs text-slate-500">{asset.owner || "-"} • {asset.department || "-"}</div>
                                        <div className="mt-1">
                                            <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${asset.status === "In Stock" ? "bg-green-100 text-green-800" :
                                                asset.status === "In Use" ? "bg-blue-100 text-blue-800" :
                                                    asset.status === "Resign" ? "bg-red-100 text-red-800" :
                                                        "bg-yellow-100 text-yellow-800"
                                                } `}>
                                                {asset.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            {scannedIds.size === 0 && (
                                <div className="text-center text-sm text-slate-500 py-4">No assets scanned yet.</div>
                            )}
                        </div>

                        {/* Desktop Table View */}
                        <table className="hidden min-w-full divide-y divide-slate-200 md:table">
                            <thead className="bg-slate-100 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-700">Computer No.</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-700">Brand</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-700">Owner</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-700">Dept</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-700">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {scannedAssetsList
                                    .map((asset) => (
                                        <tr key={asset.id}>
                                            <td className="px-4 py-2 text-sm text-slate-900">
                                                <div className="font-semibold">{asset.computerNo}</div>
                                                <div className="text-xs text-slate-500">S/N : {asset.serialNo}</div>
                                            </td>
                                            <td className="px-4 py-2 text-sm text-slate-700">
                                                <div className="font-medium">{asset.brand || "-"}</div>
                                                <div className="text-xs text-slate-500">{asset.model || "-"}</div>
                                            </td>
                                            <td className="px-4 py-2 text-sm text-slate-500">{asset.owner || "-"}</td>
                                            <td className="px-4 py-2 text-sm text-slate-500">{asset.department || "-"}</td>
                                            <td className="px-4 py-2 text-sm">
                                                <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${asset.status === "In Stock" ? "bg-green-100 text-green-800" :
                                                    asset.status === "In Use" ? "bg-blue-100 text-blue-800" :
                                                        asset.status === "Resign" ? "bg-red-100 text-red-800" :
                                                            "bg-yellow-100 text-yellow-800"
                                                    } `}>
                                                    {asset.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="rounded-lg bg-white p-4 shadow-sm md:p-6">
                    <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-red-700">
                        <AlertCircle className="h-5 w-5" />
                        Missing Assets
                    </h2>
                    <div className="max-h-96 overflow-y-auto">
                        {/* Mobile List View */}
                        <div className="md:hidden space-y-2">
                            {missingAssetsList
                                .map((asset) => (
                                    <div key={asset.id} className="rounded border border-red-100 bg-red-50 p-3 text-sm">
                                        <div className="font-bold text-slate-900">{asset.computerNo}</div>
                                        <div className="text-xs text-slate-500">S/N : {asset.serialNo}</div>
                                        <div className="text-xs text-slate-500">{asset.brand} {asset.model}</div>
                                        <div className="text-xs text-slate-500">{asset.owner || "-"} • {asset.department || "-"}</div>
                                        <div className="mt-1">
                                            <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${asset.status === "In Stock" ? "bg-green-100 text-green-800" :
                                                asset.status === "In Use" ? "bg-blue-100 text-blue-800" :
                                                    asset.status === "Resign" ? "bg-red-100 text-red-800" :
                                                        "bg-yellow-100 text-yellow-800"
                                                } `}>
                                                {asset.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                        </div>

                        {/* Desktop Table View */}
                        <table className="hidden min-w-full divide-y divide-slate-200 md:table">
                            <thead className="bg-slate-100 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-700">Computer No.</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-700">Brand</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-700">Owner</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-700">Dept</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-700">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {missingAssetsList
                                    .map((asset) => (
                                        <tr key={asset.id}>
                                            <td className="px-4 py-2 text-sm text-slate-900">
                                                <div className="font-semibold">{asset.computerNo}</div>
                                                <div className="text-xs text-slate-500">S/N : {asset.serialNo}</div>
                                            </td>
                                            <td className="px-4 py-2 text-sm text-slate-700">
                                                <div className="font-medium">{asset.brand || "-"}</div>
                                                <div className="text-xs text-slate-500">{asset.model || "-"}</div>
                                            </td>
                                            <td className="px-4 py-2 text-sm text-slate-500">{asset.owner || "-"}</td>
                                            <td className="px-4 py-2 text-sm text-slate-500">{asset.department || "-"}</td>
                                            <td className="px-4 py-2 text-sm">
                                                <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${asset.status === "In Stock" ? "bg-green-100 text-green-800" :
                                                    asset.status === "In Use" ? "bg-blue-100 text-blue-800" :
                                                        asset.status === "Resign" ? "bg-red-100 text-red-800" :
                                                            "bg-yellow-100 text-yellow-800"
                                                    } `}>
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
        </div >
    );
}
