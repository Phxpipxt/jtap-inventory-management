import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { Asset, Department, BRANDS } from "@/lib/types";
import { X, Save, Calendar, Camera } from "lucide-react";

interface EditAssetModalProps {
    asset: Asset;
    isOpen: boolean;
    onClose: () => void;
    onSave: (updatedAsset: Asset) => void;
}

export function EditAssetModal({ asset, isOpen, onClose, onSave }: EditAssetModalProps) {
    const { user } = useAuth();
    const [computerNo, setComputerNo] = useState(asset.computerNo);
    const [serialNo, setSerialNo] = useState(asset.serialNo);
    const [brand, setBrand] = useState(asset.brand || "");
    const [model, setModel] = useState(asset.model || "");
    const [status, setStatus] = useState<Asset["status"]>(asset.status);
    const [purchaseDate, setPurchaseDate] = useState(asset.purchaseDate || "");
    const [warrantyExpiry, setWarrantyExpiry] = useState(asset.warrantyExpiry || "");
    const [tags, setTags] = useState(asset.tags?.join(", ") || "");
    const [remarks, setRemarks] = useState(asset.remarks || "");
    const [hdd, setHdd] = useState(asset.hdd || "");
    const [ram, setRam] = useState(asset.ram || "");
    const [cpu, setCpu] = useState(asset.cpu || "");



    // Initialize images: Prefer 'images' array, fallback to 'image' string if present (backward compat)
    const [images, setImages] = useState<string[]>(
        asset.images && asset.images.length > 0 ? asset.images : (asset.image ? [asset.image] : [])
    );

    useEffect(() => {
        if (isOpen) {
            setComputerNo(asset.computerNo);
            setSerialNo(asset.serialNo);
            setBrand(asset.brand || "");
            setModel(asset.model || "");
            setStatus(asset.status);
            setPurchaseDate(asset.purchaseDate || "");
            setWarrantyExpiry(asset.warrantyExpiry || "");
            setTags(asset.tags?.join(", ") || "");
            setRemarks(asset.remarks || "");
            setHdd(asset.hdd || "");
            setRam(asset.ram || "");
            setCpu(asset.cpu || "");

            setImages(
                asset.images && asset.images.length > 0 ? asset.images : (asset.image ? [asset.image] : [])
            );
        }
    }, [isOpen, asset]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.name) {
            alert("User information is not available. Cannot save changes.");
            return;
        }

        const updatedAsset: Asset = {
            ...asset,
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
            image: undefined, // Deprecated, ensure it's cleared if using images
            images: images.length > 0 ? images : undefined,
            lastUpdated: new Date().toISOString(),
            updatedBy: user.name,
        };

        onSave(updatedAsset);
        onClose();
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
        e.target.value = ""; // Reset
    };

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 h-[100dvh] w-screen touch-none" onClick={onClose}>

            <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl max-h-[90dvh] overflow-y-auto overscroll-contain touch-auto" onClick={(e) => e.stopPropagation()}>
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-800">Edit Asset</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid gap-6 md:grid-cols-2">
                        {/* ... (Existing fields same as before) ... */}
                        <div className="md:col-span-2">
                            <label className="mb-1 block text-sm font-medium text-slate-700">
                                Person In Charge
                            </label>
                            <div className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700">
                                {user?.name}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Computer No.</label>
                            <input
                                type="text"
                                value={computerNo}
                                onChange={(e) => setComputerNo(e.target.value)}
                                className="w-full rounded-md border border-slate-300 px-4 py-2 text-black focus:border-blue-500 focus:outline-none"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Serial No.</label>
                            <input
                                type="text"
                                value={serialNo}
                                onChange={(e) => setSerialNo(e.target.value)}
                                className="w-full rounded-md border border-slate-300 px-4 py-2 text-black focus:border-blue-500 focus:outline-none"
                                required
                            />
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
                            <label className="text-sm font-medium text-slate-700">Status</label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value as Asset["status"])}
                                className="w-full rounded-md border border-slate-300 px-4 py-2 text-black focus:border-blue-500 focus:outline-none"
                            >
                                <option value="In Stock">In Stock</option>
                                <option value="Resign">Resign</option>
                                <option value="Missing">Missing</option>
                                <option value="Broken">Broken</option>
                            </select>
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
                            className="flex items-center gap-2 rounded-md bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 cursor-pointer"
                        >
                            <Save className="h-4 w-4" />
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
