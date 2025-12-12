import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Asset, BRANDS, AssetStatus } from "@/lib/types";
import { X, Save, Calendar, ScanBarcode } from "lucide-react";

// Dynamically import Html5Qrcode to avoid SSR issues
import type { Html5Qrcode } from "html5-qrcode";

interface AddAssetModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (newAsset: Asset) => Promise<boolean>; // Return true if success
}

export function AddAssetModal({ isOpen, onClose, onAdd }: AddAssetModalProps) {
    const { user } = useAuth();
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
        }
    }, [isOpen]);

    // Scanner Logic
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
                    alert("Could not start camera. Please ensure camera permissions are granted.");
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
        e.target.value = "";
    };

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.name) {
            alert("User information is missing.");
            return;
        }

        setLoading(true);

        const newAsset: Asset = {
            id: crypto.randomUUID(),
            computerNo,
            serialNo,
            brand: brand || undefined,
            model: model || undefined,
            status,
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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 h-[100dvh] w-screen touch-none" onClick={onClose}>
            {/* Camera Overlay */}


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


            <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl max-h-[90dvh] overflow-y-auto overscroll-contain touch-auto" onClick={(e) => e.stopPropagation()}>
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-800">Add New Asset</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid gap-6 md:grid-cols-2">
                        <div className="md:col-span-2">
                            <label className="mb-1 block text-sm font-medium text-slate-700">
                                Person In Charge
                            </label>
                            <div className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700">
                                {user?.name}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Computer No. <span className="text-red-500">*</span></label>
                            <div className="flex flex-col gap-2 md:flex-row">
                                <select
                                    value={prefix}
                                    onChange={(e) => {
                                        const newPrefix = e.target.value;
                                        setPrefix(newPrefix);
                                        const currentSuffix = computerNo.replace(prefix, "");
                                        setComputerNo(newPrefix + currentSuffix);
                                    }}
                                    className="w-[110px] rounded-md border border-slate-300 px-3 py-2 text-black focus:border-blue-500 focus:outline-none"
                                >
                                    <option value="JTAPNB-">JTAPNB</option>
                                    <option value="JTAP-">JTAP</option>
                                </select>
                                <div className="flex flex-1 gap-2">
                                    <input
                                        type="text"
                                        value={computerNo}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (!val.startsWith(prefix)) {
                                                if (val.length < prefix.length) setComputerNo(prefix);
                                                return;
                                            }
                                            const suffix = val.slice(prefix.length);
                                            if (/^\d{0,6}$/.test(suffix)) setComputerNo(val);
                                        }}
                                        className="w-full rounded-md border border-slate-300 px-4 py-2 text-black focus:border-blue-500 focus:outline-none"
                                        placeholder={`${prefix}XXXXXX`}
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => { setScanTarget("computerNo"); setIsScanning(true); }}
                                        className="rounded-md bg-slate-100 p-2 text-slate-600 hover:bg-slate-200 md:hidden"
                                    >
                                        <ScanBarcode className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Serial No. <span className="text-red-500">*</span></label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={serialNo}
                                    onChange={(e) => setSerialNo(e.target.value)}
                                    className="w-full rounded-md border border-slate-300 px-4 py-2 text-black focus:border-blue-500 focus:outline-none"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => { setScanTarget("serialNo"); setIsScanning(true); }}
                                    className="rounded-md bg-slate-100 p-2 text-slate-600 hover:bg-slate-200 md:hidden"
                                >
                                    <ScanBarcode className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Brand</label>
                            <select
                                value={brand}
                                onChange={(e) => setBrand(e.target.value)}
                                className="w-full rounded-md border border-slate-300 px-4 py-2 text-black focus:border-blue-500 focus:outline-none"
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
                                className="w-full rounded-md border border-slate-300 px-4 py-2 text-black focus:border-blue-500 focus:outline-none"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Purchase Date</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                <input
                                    type="date"
                                    value={purchaseDate}
                                    onChange={(e) => setPurchaseDate(e.target.value)}
                                    className="w-full rounded-md border border-slate-300 pl-10 pr-4 py-2 text-black focus:border-blue-500 focus:outline-none appearance-none"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Warranty Expiry</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                <input
                                    type="date"
                                    value={warrantyExpiry}
                                    onChange={(e) => setWarrantyExpiry(e.target.value)}
                                    className="w-full rounded-md border border-slate-300 pl-10 pr-4 py-2 text-black focus:border-blue-500 focus:outline-none appearance-none"
                                />
                            </div>
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-medium text-slate-700">Tags (comma separated)</label>
                            <input
                                type="text"
                                value={tags}
                                onChange={(e) => setTags(e.target.value)}
                                className="w-full rounded-md border border-slate-300 px-4 py-2 text-black focus:border-blue-500 focus:outline-none"
                                placeholder="e.g. Developer, High Performance"
                            />
                        </div>



                        <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-medium text-slate-700">Remarks</label>
                            <textarea
                                value={remarks}
                                onChange={(e) => setRemarks(e.target.value)}
                                className="w-full rounded-md border border-slate-300 px-4 py-2 text-black focus:border-blue-500 focus:outline-none"
                                placeholder="Additional notes..."
                                rows={3}
                            />
                        </div>

                        <div className="space-y-2 md:col-span-2 border-t border-slate-100 pt-4 mt-2">
                            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">Hardware Specifications (Optional)</h3>
                            <div className="grid gap-6 md:grid-cols-3">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">HDD/SSD</label>
                                    <select
                                        value={hdd}
                                        onChange={(e) => setHdd(e.target.value)}
                                        className="w-full rounded-md border border-slate-300 px-4 py-2 text-black focus:border-blue-500 focus:outline-none bg-white"
                                    >
                                        <option value="">Select Storage</option>
                                        <option value="128 GB">128 GB</option>
                                        <option value="256 GB">256 GB</option>
                                        <option value="512 GB">512 GB</option>
                                        <option value="1 TB">1 TB</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">RAM</label>
                                    <select
                                        value={ram}
                                        onChange={(e) => setRam(e.target.value)}
                                        className="w-full rounded-md border border-slate-300 px-4 py-2 text-black focus:border-blue-500 focus:outline-none bg-white"
                                    >
                                        <option value="">Select RAM</option>
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
                                        value={cpu}
                                        onChange={(e) => setCpu(e.target.value)}
                                        className="w-full rounded-md border border-slate-300 px-4 py-2 text-black focus:border-blue-500 focus:outline-none"
                                        placeholder="e.g. Intel Core i7"
                                    />
                                </div>
                            </div>
                        </div>


                    </div>

                    <div className="space-y-2 md:col-span-2">
                        <label className="text-sm font-medium text-slate-700">Asset Images</label>
                        <p className="text-xs text-slate-500">
                            Upload up to 3 images (PNG/JPEG, max 25MB).
                        </p>
                        <div className="flex flex-col gap-4">
                            {images.length > 0 && (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {images.map((img, index) => (
                                        <div key={index} className="relative aspect-square overflow-hidden rounded-lg border border-slate-200 group bg-slate-50">
                                            <img src={img} alt={`Preview ${index + 1}`} className="h-full w-full object-cover" />
                                            <button
                                                type="button"
                                                onClick={() => removeImage(index)}
                                                className="absolute top-1 right-1 rounded-full bg-red-500 p-1 text-white opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {images.length < 3 && (
                                <div className="flex flex-col gap-2 w-full md:w-auto">
                                    <div className="flex gap-2">
                                        <label className="cursor-pointer inline-flex items-center justify-center rounded-md bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm border border-slate-300 hover:bg-slate-50 md:w-auto w-full">
                                            {images.length > 0 ? "Add Another Photo" : "Upload Photo"}
                                            <input
                                                type="file"
                                                className="hidden"
                                                accept="image/png, image/jpeg"
                                                onChange={handleImageUpload}
                                            />
                                        </label>

                                    </div>
                                </div>
                            )}
                            {images.length >= 3 && (
                                <p className="text-xs text-amber-600">Maximum of 3 images reached.</p>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex items-center gap-2 rounded-md bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 cursor-pointer disabled:opacity-50"
                        >
                            <Save className="h-4 w-4" />
                            {loading ? "Saving..." : "Save Asset"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
