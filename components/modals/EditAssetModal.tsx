"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useInventory } from "@/hooks/useInventory";
import { Asset, Department, BRANDS, RAM_OPTIONS } from "@/lib/types";
import { X, Save, Calendar, Camera, Upload, Trash2, Cpu, HardDrive, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertModal } from "./AlertModal";

interface EditAssetModalProps {
    asset: Asset;
    isOpen: boolean;
    onClose: () => void;
    onSave: (updatedAsset: Asset) => void;
}

export function EditAssetModal({ asset, isOpen, onClose, onSave }: EditAssetModalProps) {
    // Helper to format ISO date string to YYYY-MM-DD for input[type="date"]
    const formatDateForInput = (dateString?: string) => {
        if (!dateString) return "";
        try {
            // Check if it's already YYYY-MM-DD
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return dateString;
            return new Date(dateString).toISOString().split('T')[0];
        } catch (e) {
            return "";
        }
    };

    const { user } = useAuth();
    const { assets } = useInventory();
    const [computerNo, setComputerNo] = useState(asset.computerNo);
    const [serialNo, setSerialNo] = useState(asset.serialNo);
    const [brand, setBrand] = useState(asset.brand || "");
    const [model, setModel] = useState(asset.model || "");
    const [status, setStatus] = useState<Asset["status"]>(asset.status);
    const [purchaseDate, setPurchaseDate] = useState(formatDateForInput(asset.purchaseDate));
    const [warrantyExpiry, setWarrantyExpiry] = useState(formatDateForInput(asset.warrantyExpiry));
    const [tags, setTags] = useState(asset.tags?.join(", ") || "");
    const [remarks, setRemarks] = useState(asset.remarks || "");
    const [hdd, setHdd] = useState(asset.hdd || "");
    const [ram, setRam] = useState(asset.ram || "");
    const [cpu, setCpu] = useState(asset.cpu || "");

    // Initialize images: Prefer 'images' array, fallback to 'image' string if present (backward compat)
    const [images, setImages] = useState<string[]>(
        asset.images && asset.images.length > 0 ? asset.images : (asset.image ? [asset.image] : [])
    );

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
        if (isOpen) {
            setComputerNo(asset.computerNo);
            setSerialNo(asset.serialNo);
            setBrand(asset.brand || "");
            setModel(asset.model || "");
            setStatus(asset.status);
            setPurchaseDate(formatDateForInput(asset.purchaseDate));
            setWarrantyExpiry(formatDateForInput(asset.warrantyExpiry));
            setTags(asset.tags?.join(", ") || "");
            setRemarks(asset.remarks || "");
            setHdd(asset.hdd || "");
            setRam(asset.ram || "");
            setCpu(asset.cpu || "");

            setImages(
                asset.images && asset.images.length > 0 ? asset.images : (asset.image ? [asset.image] : [])
            );
            // Reset alert state
            setAlertState(prev => ({ ...prev, isOpen: false }));
        }
    }, [isOpen, asset]);

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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.name) {
            showAlert("Error", "User information is not available. Cannot save changes.", "error");
            return;
        }

        if (!validateForm()) {
            return;
        }

        // Check for duplicates (excluding self)
        const isDuplicate = assets.some(a =>
            a.id !== asset.id &&
            (a.computerNo === computerNo || a.serialNo === serialNo)
        );

        if (isDuplicate) {
            showAlert("Duplicate Asset", "Another asset with this Computer No or Serial No already exists.", "error");
            return;
        }

        // Auto-fix condition and remarks based on status
        let finalCondition = asset.condition;
        let finalRemarks = remarks;

        if (status === "In Stock" || status === "In Use" || status === "Assigned") {
            finalCondition = "Working";
            // If the asset is now working, clear any previous "Issue: " remarks
            if (finalRemarks && finalRemarks.startsWith("Issue: ")) {
                finalRemarks = "";
            }
        } else if (status === "Broken") {
            finalCondition = "Not Working";
        }

        const updatedAsset: Asset = {
            ...asset,
            computerNo,
            serialNo,
            brand: brand || undefined,
            model: model || undefined,
            status,
            condition: finalCondition,
            purchaseDate: purchaseDate || undefined,
            warrantyExpiry: warrantyExpiry || undefined,
            tags: tags ? tags.split(",").map(t => t.trim()) : undefined,
            remarks: finalRemarks || undefined,
            hdd: hdd || undefined,
            ram: ram || undefined,
            cpu: cpu || undefined,
            image: undefined, // Deprecated, ensure it's cleared if using images
            images: images.length > 0 ? images : undefined,
            lastUpdated: new Date().toISOString(),
            updatedBy: user.name,
        };

        onSave(updatedAsset);
        onClose();
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
                alert(`File ${file.name} is too large (max 25MB).`);
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
                    alert(`File ${file.name} is too large (max 25MB).`);
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
        e.target.value = ""; // Reset
    };

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 h-[100dvh] w-screen touch-none" onClick={onClose}>
                    {/* Alert Modal */}
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
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-100 z-10 shrink-0">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900">Edit Asset</h2>
                                <p className="text-sm text-slate-500">Update asset information</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="rounded-full p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors cursor-pointer"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Scrollable Form Content */}
                        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-200">
                            <form id="edit-asset-form" onSubmit={handleSubmit} className="space-y-8">
                                {/* Section 1: Core Identifiers */}
                                <div className="space-y-4">
                                    <div className="grid gap-6 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-700">Computer No <span className="text-red-500">*</span></label>
                                            <input
                                                type="text"
                                                value={computerNo}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    // Optional: Smart input masking for Edit
                                                    // If it starts with known prefix, enforce rules. If legacy data, allow free text but warn on save.
                                                    if (val.startsWith("JTAPNB-") || val.startsWith("JTAP-")) {
                                                        const prefix = val.startsWith("JTAPNB-") ? "JTAPNB-" : "JTAP-";
                                                        // Enforce Prefix
                                                        if (!val.startsWith(prefix)) {
                                                            setComputerNo(prefix);
                                                            return;
                                                        }
                                                        const suffix = val.slice(prefix.length);
                                                        // Only digits, max 6
                                                        if (/^\d{0,6}$/.test(suffix)) {
                                                            setComputerNo(val);
                                                        }
                                                    } else {
                                                        // Fallback for custom/legacy formats or changing prefix completely (which requires clearing input first)
                                                        // But actually, usually we want to enforce standards.
                                                        // Let's just set it for now.
                                                        setComputerNo(val);
                                                    }
                                                }}
                                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-mono"
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-700">Serial No <span className="text-red-500">*</span></label>
                                            <input
                                                type="text"
                                                value={serialNo}
                                                onChange={(e) => setSerialNo(e.target.value)}
                                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-mono"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Section 2: Product Details */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-semibold uppercase tracking-wider text-blue-600">Product Details</h3>
                                    <div className="grid gap-6 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-700">Brand</label>
                                            <div className="relative">
                                                <select
                                                    value={brand}
                                                    onChange={(e) => setBrand(e.target.value)}
                                                    className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all cursor-pointer"
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
                                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Section 3: Dates & Status */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-semibold uppercase tracking-wider text-blue-600">Dates & Status</h3>
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
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700">Status</label>
                                        <div className="relative">
                                            <select
                                                value={status}
                                                onChange={(e) => setStatus(e.target.value as Asset["status"])}
                                                className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all cursor-pointer"
                                            >
                                                <option value="In Stock">In Stock</option>
                                                <option value="In Use">In Use</option>
                                                <option value="Broken">Broken</option>
                                                <option value="Missing">Missing</option>
                                                <option value="Resign">Resign</option>
                                            </select>
                                            <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Section 4: Specifications */}
                                <div className="rounded-xl bg-slate-50 p-6 border border-slate-100">
                                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-4 flex items-center gap-2">
                                        <Cpu className="h-4 w-4 text-blue-600" />
                                        Hardware Specifications
                                    </h3>
                                    <div className="grid gap-4 md:grid-cols-3">
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-slate-500">Storage</label>
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
                                                placeholder="e.g. i7-12700"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Section 5: Additional Info */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-semibold uppercase tracking-wider text-blue-600">Additional Info</h3>
                                    <div className="grid gap-6 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-700">Tags</label>
                                            <input
                                                type="text"
                                                value={tags}
                                                onChange={(e) => setTags(e.target.value)}
                                                placeholder="Comma separated tags..."
                                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-700">Remarks</label>
                                            <textarea
                                                value={remarks}
                                                onChange={(e) => setRemarks(e.target.value)}
                                                rows={2}
                                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all resize-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Section 6: Image Upload */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                            <Camera className="h-4 w-4 text-blue-500" />
                                            Asset Images
                                        </label>
                                        <span className="text-xs text-slate-400">{images.length}/3 photos</span>
                                    </div>

                                    <div className="grid grid-cols-3 gap-4">
                                        <AnimatePresence>
                                            {images.map((img, index) => (
                                                <motion.div
                                                    key={index}
                                                    initial={{ opacity: 0, scale: 0.8 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    exit={{ opacity: 0, scale: 0.8 }}
                                                    className="group relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-50"
                                                >
                                                    <img src={img} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
                                                    <button
                                                        type="button"
                                                        onClick={() => removeImage(index)}
                                                        className="absolute right-2 top-2 p-1.5 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-opacity opacity-0 group-hover:opacity-100 cursor-pointer"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </motion.div>
                                            ))}
                                        </AnimatePresence>

                                        {images.length < 3 && (
                                            <div
                                                className={`relative flex flex-col items-center justify-center aspect-square rounded-xl border-2 border-dashed transition-all cursor-pointer overflow-hidden
                                                    ${isDragging ? "border-blue-500 bg-blue-50/50 scale-105" : "border-slate-300 hover:border-blue-400 hover:bg-slate-50"}`}
                                                onDragOver={handleDragOver}
                                                onDragLeave={handleDragLeave}
                                                onDrop={handleDrop}
                                            >
                                                <input
                                                    type="file"
                                                    accept="image/png, image/jpeg"
                                                    onChange={handleImageUpload}
                                                    multiple
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                />
                                                <div className="text-center p-2">
                                                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-2">
                                                        <Upload className="w-4 h-4" />
                                                    </div>
                                                    <p className="text-xs font-medium text-slate-700">Add</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </form>
                        </div>

                        {/* Footer */}
                        <div className="space-y-4 p-6 border-t border-slate-100 bg-white z-10 shrink-0">
                            <div className="flex items-start gap-3 rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
                                <AlertCircle className="h-5 w-5 shrink-0 text-blue-600" />
                                <div>
                                    <p className="font-medium">Editor: {user?.name}</p>
                                    <p className="text-xs opacity-80 mt-0.5">Changes will be logged to audit trail.</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={onClose}
                                    className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    form="edit-asset-form"
                                    className="flex-[2] flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                                >
                                    <Save className="w-4 h-4" />
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
