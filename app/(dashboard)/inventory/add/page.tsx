"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useInventory } from "@/hooks/useInventory";
import { Asset, AssetStatus, Department, DEPARTMENTS, BRANDS } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";
import { ArrowLeft, ScanBarcode, Save, Camera, Calendar } from "lucide-react";
import Link from "next/link";
import type { Html5Qrcode } from "html5-qrcode"; // Type-only import
import { AlertModal } from "@/components/modals/AlertModal";

export default function AddAssetPage() {
    const router = useRouter();
    const { addAsset, updateAsset, assets } = useInventory(); // Keep assets and updateAsset for conflict resolution
    const { user } = useAuth();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [pendingAsset, setPendingAsset] = useState<Asset | null>(null);
    const [conflictingAsset, setConflictingAsset] = useState<Asset | null>(null);

    // Form data state
    const [formData, setFormData] = useState<Partial<Asset>>({
        status: "In Stock",
        computerNo: "",
        serialNo: "",
        brand: "",
        model: "",
        purchaseDate: "",
        warrantyExpiry: "",
        tags: undefined,
        owner: "", // Assuming owner might be added to Asset type
        empId: "", // Assuming empId might be added to Asset type
        department: undefined, // Assuming department might be added to Asset type
        remarks: "", // Assuming remarks might be added to Asset type
        hdd: "",
        ram: "",
        cpu: "",
    });

    // Local states for inputs that might be directly bound or have special logic
    const [prefix, setPrefix] = useState("JTAPNB-");
    const [computerNo, setComputerNo] = useState("JTAPNB-"); // This will be managed by prefix logic
    const [serialNo, setSerialNo] = useState("");
    const [brand, setBrand] = useState("");
    const [model, setModel] = useState("");
    const [purchaseDate, setPurchaseDate] = useState("");
    const [warrantyExpiry, setWarrantyExpiry] = useState("");
    const [tags, setTags] = useState("");

    // Sync local states with formData
    useEffect(() => {
        setFormData(prev => ({
            ...prev,
            computerNo: computerNo,
            serialNo: serialNo,
            brand: brand || undefined,
            model: model || undefined,
            purchaseDate: purchaseDate || undefined,
            warrantyExpiry: warrantyExpiry || undefined,
            tags: tags ? tags.split(",").map(t => t.trim()) : undefined,
        }));
    }, [computerNo, serialNo, brand, model, purchaseDate, warrantyExpiry, tags]);


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

    // Image State
    const [images, setImages] = useState<string[]>([]);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (images.length >= 3) return;

        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (reader.result) {
                    setImages(prev => [...prev, reader.result as string]);
                }
            };
            reader.readAsDataURL(file);
        }
        // Reset input value to allow same file selection
        e.target.value = "";
    };

    const startCamera = async () => {
        if (images.length >= 3) return;
        setIsCameraOpen(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error("Error accessing camera:", err);
            showAlert("Camera Error", "Could not access camera. Please check permissions.", "error");
            setIsCameraOpen(false);
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setIsCameraOpen(false);
    };

    const captureImage = () => {
        if (videoRef.current && images.length < 3) {
            const canvas = document.createElement("canvas");
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext("2d");
            if (ctx) {
                ctx.drawImage(videoRef.current, 0, 0);
                const dataUrl = canvas.toDataURL("image/jpeg");
                setImages(prev => [...prev, dataUrl]);
            }
            stopCamera();
        }
    };

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    const showAlert = (title: string, message: React.ReactNode, type: "default" | "error" | "success" | "warning" = "default") => {
        setAlertState({ isOpen: true, title, message: message as string, type });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!computerNo || !serialNo) {
            showAlert("Missing Information", "Computer No. and Serial No. are required.", "warning");
            return;
        }
        if (!user?.name) {
            showAlert("Authentication Error", "User information is missing. Please log in again.", "error");
            return;
        }

        setLoading(true);

        try {
            const newAsset: Asset = {
                id: crypto.randomUUID(),
                computerNo,
                serialNo,
                brand: brand || undefined,
                model: model || undefined,
                department: formData.department, // Use formData for department if it's managed elsewhere
                status: (formData.status || "In Stock") as AssetStatus,
                purchaseDate: purchaseDate || undefined,
                warrantyExpiry: warrantyExpiry || undefined,
                tags: tags ? tags.split(",").map(t => t.trim()) : undefined,
                lastUpdated: new Date().toISOString(),
                updatedBy: user?.name || "Unknown",
                owner: formData.owner,
                empId: formData.empId,
                remarks: formData.remarks,
                hdd: formData.hdd,
                ram: formData.ram,
                cpu: formData.cpu,
                images: images.length > 0 ? images : undefined,
            };

            // Check for ANY match (Strict or Partial)
            const conflict = assets.find(
                (a) => a.computerNo.toLowerCase() === newAsset.computerNo.toLowerCase() || a.serialNo.toLowerCase() === newAsset.serialNo.toLowerCase()
            );

            if (conflict) {
                setPendingAsset(newAsset);
                setConflictingAsset(conflict);

                // Determine message based on match type
                const isStrict = conflict.computerNo.toLowerCase() === newAsset.computerNo.toLowerCase() && conflict.serialNo.toLowerCase() === newAsset.serialNo.toLowerCase();
                const matchType = isStrict ? "Both Computer No. and Serial No." :
                    conflict.computerNo.toLowerCase() === newAsset.computerNo.toLowerCase() ? "Computer No." : "Serial No.";

                setAlertState({
                    isOpen: true,
                    title: "Conflict Detected",
                    message: `An asset with ${matchType} already exists.Do you want to replace it ? `,
                    type: "warning",
                });
                return;
            }

            await addAsset(newAsset, user.name); // Pass user.name as pic
            setAlertState({
                isOpen: true,
                title: "Success",
                message: "Asset added successfully",
                type: "success"
            });
            router.push("/inventory"); // Redirect after successful add
        } catch (err) {
            setError("Failed to add asset");
            showAlert("Error", "Failed to add asset. Please try again.", "error");
            console.error("Add asset error:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmReplace = () => {
        if (pendingAsset && conflictingAsset && user?.name) {
            const updated: Asset = {
                ...pendingAsset,
                id: conflictingAsset.id, // Keep existing ID
                updatedBy: user.name, // Ensure updatedBy is current user
            };
            updateAsset(updated, user.name, "Update", "Replaced via Add Asset conflict resolution");
            router.push("/inventory");
        }
    };

    // Scanner State
    const [isScanning, setIsScanning] = useState(false);
    const [scanTarget, setScanTarget] = useState<"computerNo" | "serialNo">("computerNo");
    const scannerRef = useRef<Html5Qrcode | null>(null);

    // Initialize scanner when isScanning becomes true
    useEffect(() => {
        let scanner: Html5Qrcode | null = null;

        if (isScanning) {
            // Dynamically import to avoid SSR issues
            import("html5-qrcode").then(({ Html5Qrcode }) => {
                scanner = new Html5Qrcode("reader");
                scannerRef.current = scanner;

                const config = { fps: 10, qrbox: { width: 250, height: 250 } };

                // Prefer back camera (environment)
                scanner.start(
                    { facingMode: "environment" },
                    config,
                    (decodedText) => {
                        if (scanTarget === "computerNo") {
                            setComputerNo(decodedText);
                        } else {
                            setSerialNo(decodedText);
                        }
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
    }, [isScanning, scanTarget]);

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


    return (
        <div className="mx-auto max-w-2xl space-y-6 pb-20">
            <AlertModal
                isOpen={alertState.isOpen}
                onClose={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
                title={alertState.title}
                message={alertState.message}
                type={alertState.type}
                showCancel={!!pendingAsset}
                onConfirm={pendingAsset ? handleConfirmReplace : undefined}
                confirmText={pendingAsset ? "Replace" : "OK"}
                cancelText="Cancel"
            />
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/inventory" className="rounded-full p-2 hover:bg-slate-100">
                        <ArrowLeft className="h-6 w-6 text-slate-600" />
                    </Link>
                    <h1 className="text-2xl font-bold text-slate-800">Add New Asset</h1>
                </div>
            </div>

            {/* Camera Modal */}
            {isCameraOpen && (
                <div className="fixed inset-0 z-50 flex flex-col bg-black">
                    <div className="flex items-center justify-between bg-black p-4 text-white">
                        <h3 className="text-lg font-semibold">Take Photo</h3>
                        <button
                            onClick={stopCamera}
                            className="rounded-full bg-white/20 p-2 text-white hover:bg-white/30 cursor-pointer"
                        >
                            <span className="sr-only">Close</span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>
                    <div className="flex-1 flex items-center justify-center bg-black">
                        <video ref={videoRef} autoPlay playsInline className="max-h-full max-w-full" />
                    </div>
                    <div className="p-8 flex justify-center">
                        <button
                            onClick={captureImage}
                            className="h-16 w-16 rounded-full bg-white border-4 border-slate-300 shadow-lg active:scale-95 transition-transform"
                        >
                        </button>
                    </div>
                </div>
            )}

            {/* Scanner UI Overlay */}
            {isScanning && (
                <div className="fixed inset-0 z-50 flex flex-col bg-black">
                    <div className="flex items-center justify-between bg-black p-4 text-white">
                        <h3 className="text-lg font-semibold">Scan {scanTarget === "computerNo" ? "Asset Tag" : "Serial Number"}</h3>
                        <button
                            onClick={handleStopScanning}
                            className="rounded-full bg-white/20 p-2 text-white hover:bg-white/30 cursor-pointer"
                        >
                            <span className="sr-only">Close</span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>
                    <div className="flex-1 flex items-center justify-center bg-black">
                        <div id="reader" className="w-full max-w-md overflow-hidden rounded-lg"></div>
                    </div>
                    <div className="p-8 text-center text-white/70">
                        <p>Point camera at a barcode or QR code</p>
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6 rounded-lg bg-white p-4 shadow-sm md:p-6">


                <div className="grid gap-6 md:grid-cols-2">
                    <div className="md:col-span-2">
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                            Person In Charge
                        </label>
                        <div className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700">
                            {user?.name || "Loading..."}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Computer No. (Asset Tag) <span className="text-red-500">*</span></label>
                        <div className="flex flex-col gap-2 md:flex-row">
                            <select
                                value={prefix}
                                onChange={(e) => {
                                    const newPrefix = e.target.value;
                                    setPrefix(newPrefix);
                                    // Update current computerNo to match new prefix
                                    const currentSuffix = computerNo.replace(prefix, "");
                                    setComputerNo(newPrefix + currentSuffix);
                                }}
                                className="w-full rounded-md border border-slate-300 px-3 py-2 text-black focus:border-blue-500 focus:outline-none md:w-auto"
                            >
                                <option value="JTAPNB-">JTAPNB</option>
                                <option value="JTAP-">JTAP</option>
                            </select>
                            <div className="flex w-full gap-2 md:flex-1">
                                <div className="relative flex-1">
                                    <ScanBarcode className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        value={computerNo}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            // Always enforce prefix
                                            if (!val.startsWith(prefix)) {
                                                // If user tries to delete prefix, reset to just prefix
                                                if (val.length < prefix.length) {
                                                    setComputerNo(prefix);
                                                }
                                                return;
                                            }

                                            const suffix = val.slice(prefix.length);
                                            // Allow only digits and max 6 chars
                                            if (/^\d{0,6}$/.test(suffix)) {
                                                setComputerNo(val);
                                            }
                                        }}
                                        className="w-full rounded-md border border-slate-300 pl-10 pr-4 py-3 text-black focus:border-blue-500 focus:outline-none md:py-2 md:text-sm"
                                        placeholder={`${prefix} XXXXXX`}
                                        required
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setScanTarget("computerNo");
                                        setIsScanning(true);
                                    }}
                                    className="flex items-center justify-center rounded-md bg-slate-100 px-4 text-slate-700 hover:bg-slate-200 md:hidden cursor-pointer"
                                    title="Open Camera Scanner"
                                >
                                    <Camera className="h-6 w-6" />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Serial No. <span className="text-red-500">*</span></label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <ScanBarcode className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    value={serialNo}
                                    onChange={(e) => setSerialNo(e.target.value)}
                                    className="w-full rounded-md border border-slate-300 pl-10 pr-4 py-3 text-black focus:border-blue-500 focus:outline-none md:py-2 md:text-sm"
                                    placeholder="Enter serial number"
                                    required
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setScanTarget("serialNo");
                                    setIsScanning(true);
                                }}
                                className="flex items-center justify-center rounded-md bg-slate-100 px-4 text-slate-700 hover:bg-slate-200 md:hidden cursor-pointer"
                                title="Open Camera Scanner"
                            >
                                <Camera className="h-6 w-6" />
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Brand</label>
                        <select
                            value={brand}
                            onChange={(e) => setBrand(e.target.value)}
                            className="w-full rounded-md border border-slate-300 px-4 py-3 text-black focus:border-blue-500 focus:outline-none md:py-2 md:text-sm"
                        >
                            <option value="">Select Brand</option>
                            {BRANDS.map((b) => (
                                <option key={b} value={b}>{b}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Model</label>
                        <input
                            type="text"
                            value={model}
                            onChange={(e) => setModel(e.target.value)}
                            className="w-full rounded-md border border-slate-300 px-4 py-3 text-black focus:border-blue-500 focus:outline-none md:py-2 md:text-sm"
                            placeholder="e.g. T14 Gen 5"
                        />
                    </div>
                    {/* 
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700"></label>
                        <input
                            type="text"
                            value={model}
                            onChange={(e) => setModel(e.target.value)}
                            className="w-full rounded-md border border-slate-300 px-4 py-3 text-black focus:border-blue-500 focus:outline-none md:py-2 md:text-sm"
                            placeholder="e.g. T14 Gen 5"
                        />
                    </div> */}



                    <div className="space-y-2 min-w-0">
                        <label className="text-sm font-medium text-slate-700">Purchase Date</label>
                        <div className="relative w-full">
                            <Calendar className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                            <input
                                type="date"
                                value={purchaseDate}
                                onChange={(e) => setPurchaseDate(e.target.value)}
                                className="w-full min-w-0 rounded-md border border-slate-300 pl-10 pr-4 py-3 text-black focus:border-blue-500 focus:outline-none md:py-2 md:text-sm box-border appearance-none"
                            />
                        </div>
                    </div>

                    <div className="space-y-2 min-w-0">
                        <label className="text-sm font-medium text-slate-700">Warranty Expiry</label>
                        <div className="relative w-full">
                            <Calendar className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                            <input
                                type="date"
                                value={warrantyExpiry}
                                onChange={(e) => setWarrantyExpiry(e.target.value)}
                                className="w-full min-w-0 rounded-md border border-slate-300 pl-10 pr-4 py-3 text-black focus:border-blue-500 focus:outline-none md:py-2 md:text-sm box-border appearance-none"
                            />
                        </div>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                        <label className="text-sm font-medium text-slate-700">Tags (comma separated)</label>
                        <input
                            type="text"
                            value={tags}
                            onChange={(e) => setTags(e.target.value)}
                            className="w-full rounded-md border border-slate-300 px-4 py-3 text-black focus:border-blue-500 focus:outline-none md:py-2 md:text-sm"
                            placeholder="e.g. Special, Common"
                        />
                    </div>

                    <div className="space-y-2 md:col-span-2 border-t border-slate-100 pt-4 mt-2">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">Hardware Specifications (Optional)</h3>
                        <div className="grid gap-6 md:grid-cols-3">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">HDD/SSD</label>
                                <select
                                    value={formData.hdd || ""}
                                    onChange={(e) => setFormData({ ...formData, hdd: e.target.value })}
                                    className="w-full rounded-md border border-slate-300 px-4 py-3 text-black focus:border-blue-500 focus:outline-none md:py-2 md:text-sm appearance-none bg-white"
                                >
                                    <option value="">Select Storage</option>
                                    {/* 128 GB, 256 GB, 512 GB, 1 TB */}
                                    <option value="128 GB">128 GB</option>
                                    <option value="256 GB">256 GB</option>
                                    <option value="512 GB">512 GB</option>
                                    <option value="1 TB">1 TB</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">RAM</label>
                                <select
                                    value={formData.ram || ""}
                                    onChange={(e) => setFormData({ ...formData, ram: e.target.value })}
                                    className="w-full rounded-md border border-slate-300 px-4 py-3 text-black focus:border-blue-500 focus:outline-none md:py-2 md:text-sm appearance-none bg-white"
                                >
                                    <option value="">Select RAM</option>
                                    {/* 8 GB, 16 GB, 32 GB, 64 GB, 128 GB */}
                                    <option value="8 GB">8 GB</option>
                                    <option value="16 GB">16 GB</option>
                                    <option value="32 GB">32 GB</option>
                                    <option value="64 GB">64 GB</option>
                                    <option value="128 GB">128 GB</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">CPU</label>
                                <input
                                    type="text"
                                    value={formData.cpu || ""}
                                    onChange={(e) => setFormData({ ...formData, cpu: e.target.value })}
                                    className="w-full rounded-md border border-slate-300 px-4 py-3 text-black focus:border-blue-500 focus:outline-none md:py-2 md:text-sm"
                                    placeholder="e.g. Intel Core i7"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Asset Images <span className="text-slate-400 font-normal">(Max 3)</span></label>
                    <div className="flex flex-col gap-4">
                        {images.length > 0 && (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {images.map((img, index) => (
                                    <div key={index} className="relative aspect-square w-full rounded-lg overflow-hidden border border-slate-200 group bg-slate-100">
                                        <img src={img} alt={`Asset ${index + 1}`} className="w-full h-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => removeImage(index)}
                                            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 cursor-pointer shadow-sm"
                                            title="Remove Image"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                        </button>
                                        <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                                            {index + 1}/3
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex flex-col gap-2 sm:flex-row items-start">
                            {images.length < 3 && (
                                <>
                                    <div className="flex flex-col gap-2 w-full md:w-auto">
                                        <label className="cursor-pointer inline-flex items-center justify-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm border border-slate-300 hover:bg-slate-50 md:w-auto w-full">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                                            {images.length > 0 ? "Add Another Photo" : "Upload Photo"}
                                            <input
                                                type="file"
                                                className="hidden"
                                                accept="image/png, image/jpeg"
                                                onChange={handleImageUpload}
                                            />
                                        </label>
                                        <p className="text-xs text-slate-500 text-center md:text-left">
                                            Choose an image file (PNG/JPEG, max 25MB)
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={startCamera}
                                        className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer w-full md:w-auto"
                                        disabled={isCameraOpen}
                                    >
                                        <Camera className="h-4 w-4" />
                                        Take Photo
                                    </button>
                                </>
                            )}
                            {images.length >= 3 && (
                                <p className="text-sm text-amber-600 py-2">Maximum of 3 images reached.</p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        className="flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-6 py-3 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 md:w-auto md:py-2 md:text-sm cursor-pointer"
                    >
                        <Save className="h-5 w-5 md:h-4 md:w-4" />
                        Save Asset
                    </button>
                </div>
            </form>
        </div>
    );
}
