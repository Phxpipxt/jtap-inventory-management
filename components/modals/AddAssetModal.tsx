import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useInventory } from "@/hooks/useInventory";
import { Asset, BRANDS, AssetStatus, RAM_OPTIONS } from "@/lib/types";
import { X, Save, Calendar, ScanBarcode, Camera, Upload, AlertCircle, Plus, Image as ImageIcon, Cpu } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertModal } from "./AlertModal";

// Dynamically import Html5Qrcode to avoid SSR issues
import type { Html5Qrcode } from "html5-qrcode";

interface AddAssetModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (newAsset: Asset) => Promise<boolean>; // Return true if success
}

export function AddAssetModal({ isOpen, onClose, onAdd }: AddAssetModalProps) {
    const { user } = useAuth();
    const { assets } = useInventory();
    const [loading, setLoading] = useState(false);

    // Form State
    const [prefix, setPrefix] = useState("JTAPNB-");
    const [computerNo, setComputerNo] = useState("JTAPNB-");
    const [serialNo, setSerialNo] = useState("");
    const [brand, setBrand] = useState("");
    const [model, setModel] = useState("");
    const [status, setStatus] = useState<AssetStatus>("In Stock");
    const [purchaseDate, setPurchaseDate] = useState("");
    const [warrantyExpiry, setWarrantyExpiry] = useState("");
    const [tags, setTags] = useState("");
    const [remarks, setRemarks] = useState("");
    const [hdd, setHdd] = useState("");
    const [ram, setRam] = useState("");
    const [cpu, setCpu] = useState("");
    const [images, setImages] = useState<string[]>([]);

    // Scanner State
    const [isScanning, setIsScanning] = useState(false);
    const [scanTarget, setScanTarget] = useState<"computerNo" | "serialNo">("computerNo");
    const scannerRef = useRef<Html5Qrcode | null>(null);

    // Drag & Drop State
    const [isDragging, setIsDragging] = useState(false);

    // Alert State
    const [alertState, setAlertState] = useState<{ isOpen: boolean; title: string; message: string | React.ReactNode; type: "default" | "error" | "warning" }>({
        isOpen: false,
        title: "",
        message: "",
        type: "default",
    });

    const showAlert = (title: string, message: string | React.ReactNode, type: "default" | "error" | "warning" = "default") => {
        setAlertState({ isOpen: true, title, message, type });
    };

    useEffect(() => {
        if (!isOpen) {
            // Reset form when closed
            setPrefix("JTAPNB-");
            setComputerNo("JTAPNB-");
            setSerialNo("");
            setBrand("");
            setModel("");
            setStatus("In Stock");
            setPurchaseDate("");
            setWarrantyExpiry("");
            setTags("");
            setRemarks("");
            setHdd("");
            setRam("");
            setCpu("");
            setImages([]);
            setIsScanning(false);
            setAlertState(prev => ({ ...prev, isOpen: false }));
        }
    }, [isOpen]);

    // Scanner Logic (Keep existing implementation)
    useEffect(() => {
        let scanner: Html5Qrcode | null = null;
        if (isScanning && isOpen) {
            import("html5-qrcode").then(({ Html5Qrcode }) => {
                scanner = new Html5Qrcode("add-asset-reader");
                scannerRef.current = scanner;
                const config = { fps: 10, qrbox: { width: 250, height: 250 } };
                scanner.start(
                    { facingMode: "environment" },
                    config,
                    (decodedText) => {
                        if (scanTarget === "computerNo") {
                            setComputerNo(decodedText);
                        } else {
                            setSerialNo(decodedText);
                        }
                        handleStopScanning();
                    },
                    (errorMessage) => { }
                ).catch((err) => {
                    console.error("Error starting scanner", err);
                    showAlert("Scanner Error", "Could not start camera. Please ensure camera permissions are granted.", "error");
                    setIsScanning(false);
                });
            });
        }
        return () => {
            if (scanner && scanner.isScanning) {
                scanner.stop().then(() => scanner?.clear()).catch(console.error);
            }
        };
    }, [isScanning, isOpen, scanTarget]);

    const handleStopScanning = () => {
        if (scannerRef.current) {
            scannerRef.current.stop().then(() => {
                scannerRef.current?.clear();
                setIsScanning(false);
            }).catch(console.error);
        } else {
            setIsScanning(false);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (images.length >= 3) return;
        const files = Array.from(e.dataTransfer.files);
        const remainingSlots = 3 - images.length;
        const filesToProcess = files.slice(0, remainingSlots);

        filesToProcess.forEach(file => {
            if (file.size > 25 * 1024 * 1024) {
                showAlert("File Too Large", `File ${file.name} is too large (max 25MB).`, "error");
                return;
            }
            if (file.type.startsWith("image/")) {
                const reader = new FileReader();
                reader.onloadend = () => {
                    if (reader.result) {
                        setImages(prev => {
                            if (prev.length >= 3) return prev;
                            return [...prev, reader.result as string];
                        });
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (images.length >= 3) return;
        const files = e.target.files;
        if (files && files.length > 0) {
            const remainingSlots = 3 - images.length;
            const filesToProcess = Array.from(files).slice(0, remainingSlots);

            filesToProcess.forEach(file => {
                if (file.size > 25 * 1024 * 1024) {
                    showAlert("File Too Large", `File ${file.name} is too large (max 25MB).`, "error");
                    return;
                }
                const reader = new FileReader();
                reader.onloadend = () => {
                    if (reader.result) {
                        setImages(prev => {
                            if (prev.length >= 3) return prev;
                            return [...prev, reader.result as string];
                        });
                    }
                };
                reader.readAsDataURL(file);
            });
        }
        e.target.value = "";
    };

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };


    const validateForm = () => {
        // 1. Validate Computer No
        // Format: JTAPNB-XXXXXX or JTAP-XXXXXX (6 digits)
        const computerNoRegex = /^(JTAPNB-|JTAP-)\d{6}$/;
        if (!computerNoRegex.test(computerNo)) {
            showAlert(
                "Invalid Format: Computer No",
                <span>
                    The Computer No <b>"{computerNo}"</b> is invalid.
                    <br /><br />
                    It must follow the format:
                    <ul className="list-disc ml-5 mt-1">
                        <li>Start with <b>JTAPNB-</b> or <b>JTAP-</b></li>
                        <li>Followed by exactly <b>6 digits</b></li>
                    </ul>
                    <br />
                    Example: <b>JTAPNB-200801</b>
                </span>,
                "error"
            );
            return false;
        }

        // 2. Validate Serial No
        // Format: Alphanumeric, at least 5 chars
        const serialNoRegex = /^[A-Z0-9]{5,}$/;
        // Create a cleaned version for checking (remove spaces/dashes if user typed them, though we usually want exact matches)
        // For now strict check
        if (!serialNoRegex.test(serialNo)) {
            showAlert(
                "Invalid Format: Serial No",
                <span>
                    The Serial No <b>"{serialNo}"</b> is invalid.
                    <br /><br />
                    It must be:
                    <ul className="list-disc ml-5 mt-1">
                        <li>Alphanumeric (A-Z, 0-9)</li>
                        <li>At least <b>5 characters</b> long</li>
                    </ul>
                    <br />
                    Example: <b>PF12345</b>
                </span>,
                "error"
            );
            return false;
        }

        return true;
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.name) {
            showAlert("Error", "User information is missing.", "error");
            return;
        }

        if (!validateForm()) {
            return;
        }

        setLoading(true);

        // Check for duplicates
        const isDuplicate = assets.some(a => a.computerNo === computerNo || a.serialNo === serialNo);
        if (isDuplicate) {
            showAlert("Duplicate Asset", "An asset with this Computer No or Serial No already exists.", "error");
            setLoading(false);
            return;
        }

        // Determine condition based on status
        let condition: string | undefined = undefined;
        if (status === "In Stock" || status === "In Use" || status === "Assigned") {
            condition = "Working";
        } else if (status === "Broken") {
            condition = "Not Working";
        }

        const newAsset: Asset = {
            id: crypto.randomUUID(),
            computerNo,
            serialNo,
            brand: brand || undefined,
            model: model || undefined,
            status,
            condition,
            purchaseDate: purchaseDate || undefined,
            warrantyExpiry: warrantyExpiry || undefined,
            tags: tags ? tags.split(",").map(t => t.trim()) : undefined,
            remarks: remarks || undefined,
            hdd: hdd || undefined,
            ram: ram || undefined,
            cpu: cpu || undefined,
            images: images.length > 0 ? images : undefined,
            lastUpdated: new Date().toISOString(),
            updatedBy: user.name,
        };

        const success = await onAdd(newAsset);
        setLoading(false);
        if (success) {
            onClose();
        }
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
                        onClick={onClose}
                    >
                        {/* Alert Modal */}
                        <AlertModal
                            isOpen={alertState.isOpen}
                            onClose={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
                            title={alertState.title}
                            message={alertState.message}
                            type={alertState.type}
                        />

                        {/* Scanner Overlay */}
                        {isScanning && (
                            <div className="fixed inset-0 z-[60] flex flex-col bg-black" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-between bg-black p-4 text-white">
                                    <h3 className="text-lg font-semibold">Scan {scanTarget === "computerNo" ? "Asset Tag" : "Serial Number"}</h3>
                                    <button onClick={handleStopScanning} className="rounded-full bg-white/20 p-2 text-white hover:bg-white/30 cursor-pointer">
                                        <X className="h-6 w-6" />
                                    </button>
                                </div>
                                <div className="flex-1 flex items-center justify-center bg-black">
                                    <div id="add-asset-reader" className="w-full max-w-md overflow-hidden rounded-lg"></div>
                                </div>
                                <div className="p-8 text-center text-white/70">
                                    <p>Point camera at a barcode or QR code</p>
                                </div>
                            </div>
                        )}

                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl max-h-[90dvh] overflow-hidden flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-100 z-10">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900">Add New Asset</h2>
                                    <p className="text-sm text-slate-500">Enter details manually or scan code</p>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="rounded-full p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            {/* Scrollable Content */}
                            <div className="flex-1 overflow-y-auto p-6">
                                <form id="add-asset-form" onSubmit={handleSubmit} className="space-y-8">

                                    {/* Section 1: Core Identifiers */}
                                    <div className="space-y-4">
                                        <div className="grid gap-6 md:grid-cols-2">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-slate-700">Computer No. <span className="text-red-500">*</span></label>
                                                <div className="flex gap-2">
                                                    <div className="relative flex-1">
                                                        <input
                                                            type="text"
                                                            value={computerNo}
                                                            onChange={(e) => {
                                                                let val = e.target.value;

                                                                // 1. Enforce Prefix: If user tries to delete part of prefix, restore it
                                                                if (!val.startsWith(prefix)) {
                                                                    // If they deleted the whole thing or part of it, just reset to prefix
                                                                    setComputerNo(prefix);
                                                                    return;
                                                                }

                                                                // 2. Extract Suffix
                                                                const suffix = val.slice(prefix.length);

                                                                // 3. Validation: Only digits allowed, max 6 digits
                                                                // Regex: ^\d*$ matches empty string or digits only
                                                                if (/^\d{0,6}$/.test(suffix)) {
                                                                    setComputerNo(val);
                                                                }
                                                                // If invalid (has letters or >6 digits), do nothing (ignore input)
                                                            }}
                                                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-mono"
                                                            placeholder={`${prefix}XXXXXX`}
                                                            required
                                                        />
                                                        <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                                            <select
                                                                value={prefix}
                                                                onChange={(e) => {
                                                                    const newPrefix = e.target.value;
                                                                    setPrefix(newPrefix);
                                                                    const suffix = computerNo.replace(/^(JTAPNB-|JTAP-)/, "");
                                                                    setComputerNo(newPrefix + suffix);
                                                                }}
                                                                className="h-7 rounded-lg border-0 bg-white/50 text-xs font-medium text-slate-500 hover:text-slate-700 focus:ring-0 cursor-pointer"
                                                            >
                                                                <option value="JTAPNB-">NB</option>
                                                                <option value="JTAP-">PC</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => { setScanTarget("computerNo"); setIsScanning(true); }}
                                                        className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 transition-all"
                                                        title="Scan Barcode"
                                                    >
                                                        <ScanBarcode className="h-5 w-5" />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-slate-700">Serial No. <span className="text-red-500">*</span></label>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={serialNo}
                                                        onChange={(e) => setSerialNo(e.target.value)}
                                                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-mono"
                                                        placeholder="Enter Serial No"
                                                        required
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => { setScanTarget("serialNo"); setIsScanning(true); }}
                                                        className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 transition-all"
                                                        title="Scan Serial"
                                                    >
                                                        <ScanBarcode className="h-5 w-5" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Section 2: Specification */}
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-semibold uppercase tracking-wider text-blue-600">Product Details</h3>
                                        <div className="grid gap-6 md:grid-cols-2">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-slate-700">Brand</label>
                                                <div className="relative">
                                                    <select
                                                        value={brand}
                                                        onChange={(e) => setBrand(e.target.value)}
                                                        className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                                                    >
                                                        <option value="">Select Brand</option>
                                                        {BRANDS.map((b) => (
                                                            <option key={b} value={b}>{b}</option>
                                                        ))}
                                                    </select>
                                                    <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-slate-700">Model</label>
                                                <input
                                                    type="text"
                                                    value={model}
                                                    onChange={(e) => setModel(e.target.value)}
                                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                                                    placeholder="e.g. ThinkPad T14 Gen 3"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Section 3: Dates & Warranty */}
                                    <div className="grid gap-6 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-700">Purchase Date</label>
                                            <div className="relative group">
                                                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-hover:text-blue-500 transition-colors pointer-events-none" />
                                                <input
                                                    type="date"
                                                    value={purchaseDate}
                                                    onChange={(e) => setPurchaseDate(e.target.value)}
                                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2.5 text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all appearance-none"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-700">Warranty Expiry</label>
                                            <div className="relative group">
                                                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-hover:text-blue-500 transition-colors pointer-events-none" />
                                                <input
                                                    type="date"
                                                    value={warrantyExpiry}
                                                    onChange={(e) => setWarrantyExpiry(e.target.value)}
                                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2.5 text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all appearance-none"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Section 4: Hardware Specs */}
                                    <div className="rounded-xl bg-slate-50 p-6 border border-slate-100">
                                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-4 flex items-center gap-2">
                                            <Cpu className="h-4 w-4 text-blue-600" />
                                            Hardware Specifications
                                        </h3>
                                        <div className="grid gap-4 md:grid-cols-3">
                                            <div className="space-y-1">
                                                <label className="text-xs font-semibold text-slate-500">HDD/SSD</label>
                                                <select
                                                    value={hdd}
                                                    onChange={(e) => setHdd(e.target.value)}
                                                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none transition-all"
                                                >
                                                    <option value="">Select</option>
                                                    <option value="128 GB">128 GB</option>
                                                    <option value="256 GB">256 GB</option>
                                                    <option value="512 GB">512 GB</option>
                                                    <option value="1 TB">1 TB</option>
                                                </select>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-semibold text-slate-500">RAM</label>
                                                <select
                                                    value={ram}
                                                    onChange={(e) => setRam(e.target.value)}
                                                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none transition-all"
                                                >
                                                    <option value="">Select</option>
                                                    {RAM_OPTIONS.map((opt) => (
                                                        <option key={opt} value={opt}>{opt}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-semibold text-slate-500">CPU</label>
                                                <input
                                                    type="text"
                                                    value={cpu}
                                                    onChange={(e) => setCpu(e.target.value)}
                                                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none transition-all"
                                                    placeholder="e.g. i7-12700H"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Section 5: Images (Premium Grid) */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                                <Camera className="h-4 w-4 text-blue-500" />
                                                Asset Images
                                            </label>
                                            <span className="text-xs text-slate-400">{images.length}/3 photos</span>
                                        </div>

                                        <div className="grid grid-cols-3 gap-4">
                                            {images.map((img, index) => (
                                                <motion.div
                                                    initial={{ opacity: 0, scale: 0.8 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    key={index}
                                                    className="group relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
                                                >
                                                    <img src={img} alt={`Preview ${index}`} className="h-full w-full object-cover" />
                                                    <button
                                                        type="button"
                                                        onClick={() => removeImage(index)}
                                                        className="absolute right-2 top-2 rounded-full bg-red-500/90 p-1.5 text-white opacity-0 backdrop-blur-sm transition-all hover:bg-red-600 group-hover:opacity-100"
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </button>
                                                </motion.div>
                                            ))}

                                            {images.length < 3 && (
                                                <label
                                                    onDragOver={handleDragOver}
                                                    onDragLeave={handleDragLeave}
                                                    onDrop={handleDrop}
                                                    className={`aspect-square flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed transition-all cursor-pointer ${isDragging
                                                        ? "border-blue-500 bg-blue-50/50"
                                                        : "border-slate-300 hover:border-blue-400 hover:bg-slate-50"
                                                        }`}
                                                >
                                                    <div className="rounded-full bg-slate-100 p-3 group-hover:bg-blue-50 transition-colors">
                                                        <Plus className="h-6 w-6 text-slate-400 group-hover:text-blue-500" />
                                                    </div>
                                                    <input
                                                        type="file"
                                                        className="hidden"
                                                        accept="image/png, image/jpeg"
                                                        multiple
                                                        onChange={handleImageUpload}
                                                    />
                                                    <span className="text-xs font-medium text-slate-500">Upload</span>
                                                </label>
                                            )}
                                        </div>

                                    </div>
                                </form>
                            </div>

                            {/* Footer / Submit */}
                            <div className="space-y-4 p-6 border-t border-slate-100 bg-white z-10 shrink-0">
                                <div className="flex items-start gap-3 rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
                                    <AlertCircle className="h-5 w-5 shrink-0 text-blue-600" />
                                    <div>
                                        <p className="font-medium">Recorder: {user?.name}</p>
                                        <p className="text-xs opacity-80 mt-0.5">Asset will be logged with your signature.</p>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        form="add-asset-form"
                                        disabled={loading}
                                        className="flex-[2] flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {loading ? (
                                            <span className="animate-pulse">Processing...</span>
                                        ) : (
                                            <>
                                                <Save className="h-4 w-4" />
                                                Confirm & Save Asset
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
