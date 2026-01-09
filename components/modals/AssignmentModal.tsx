"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Asset, Department, PERSONS_IN_CHARGE } from "@/lib/types";
import { X, User, AlertTriangle } from "lucide-react";

interface AssignmentModalProps {
    asset: Asset;
    isOpen: boolean;
    onClose: () => void;
    onSave: (updatedAsset: Asset) => void;
}

export function AssignmentModal({ asset, isOpen, onClose, onSave }: AssignmentModalProps) {
    const { user } = useAuth();
    const [owner, setOwner] = useState(asset.owner || "");
    const [empId, setEmpId] = useState(asset.empId || "JTC_");
    const [department, setDepartment] = useState<Department | "">(asset.department || "");
    const [action, setAction] = useState<"Assign" | "Return">(asset.owner ? "Return" : "Assign");

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // No need to check for PIC as it's automatically user.name
        // if (!pic) {
        //     alert("Please select a Person In Charge.");
        //     return;
        // }

        const updatedAsset: Asset = {
            ...asset,
            owner: action === "Return" ? null : owner,
            empId: action === "Return" ? null : empId,
            department: action === "Return" ? null : (department as Department),
            status: action === "Return" ? "In Stock" : "In Use",
            lastUpdated: new Date().toISOString(),
            updatedBy: user?.name || "Unknown", // Use user.name from auth
            distributionDate: action === "Assign" ? new Date().toISOString() : undefined,
        };

        onSave(updatedAsset);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
                <div className="mb-6 flex items-start justify-between border-b border-slate-100 pb-4">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">
                            {action === "Return" ? "Return Asset" : "Assign Asset"}
                        </h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="font-mono text-sm font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{asset.computerNo}</span>
                            <span className="text-xs text-slate-400">•</span>
                            <span className="font-mono text-xs text-slate-500">SN: {asset.serialNo}</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {action === "Assign" && (
                        <>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">Owner Name</label>
                                <input
                                    type="text"
                                    value={owner}
                                    onChange={(e) => setOwner(e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-black focus:border-blue-500 focus:outline-none"
                                    required
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">Employee ID</label>
                                <input
                                    type="text"
                                    value={empId}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (!val.startsWith("JTC_")) {
                                            // If user tries to delete prefix, keep it
                                            if (val === "JTC") {
                                                setEmpId("JTC_");
                                            }
                                            return;
                                        }

                                        // Get the part after JTC_
                                        const suffix = val.substring(4);

                                        // Only allow digits and max 5 chars
                                        if (/^\d{0,5}$/.test(suffix)) {
                                            setEmpId(val);
                                        }
                                    }}
                                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-black focus:border-blue-500 focus:outline-none"
                                    required
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">Department</label>
                                <select
                                    value={department}
                                    onChange={(e) => setDepartment(e.target.value as Department)}
                                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-black focus:border-blue-500 focus:outline-none"
                                    required
                                >
                                    <option value="">Select Department</option>
                                    <option value="Board of Directors">Board of Directors</option>
                                    <option value="BP">BP</option>
                                    <option value="CU">CU</option>
                                    <option value="CP">CP</option>
                                    <option value="FA">FA</option>
                                    <option value="HR">HR</option>
                                    <option value="IT">IT</option>
                                    <option value="OD">OD</option>
                                    <option value="PL">PL</option>
                                    <option value="PE">PE</option>
                                    <option value="PU">PU</option>
                                    <option value="QA">QA</option>
                                    <option value="SA">SA</option>
                                    <option value="TC">TC</option>
                                </select>
                            </div>
                        </>
                    )}

                    {action === "Return" && (
                        <div className="space-y-4">
                            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3 block">Currently Assigned To</span>
                                <div className="flex items-center gap-4">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600 ring-4 ring-white shadow-sm">
                                        <User className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <p className="text-xl font-bold text-slate-900">{asset.owner}</p>
                                        <div className="flex items-center gap-2 text-sm text-slate-500">
                                            <span>{asset.empId || "No ID"}</span>
                                            <span>•</span>
                                            <span>{asset.department || "No Dept"}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 flex gap-3 items-start">
                                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                                <div className="text-sm text-amber-900">
                                    <p className="font-semibold">Confirm Return to Stock?</p>
                                    <p className="mt-0.5 opacity-90">This action will remove the current owner and update status to <span className="font-bold">In Stock</span>.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="mt-4">
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                            Person In Charge
                        </label>
                        <div className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700">
                            {user?.name}
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-4">
                        {action === "Assign" && asset.owner ? (
                            <button
                                type="button"
                                onClick={() => setAction("Return")}
                                className="text-sm font-medium text-red-600 hover:text-red-800 hover:underline cursor-pointer"
                            >
                                Return to Stock
                            </button>
                        ) : action === "Return" && !asset.owner ? (
                            <button
                                type="button"
                                onClick={() => setAction("Assign")}
                                className="text-sm font-medium text-slate-600 hover:text-slate-800 hover:underline cursor-pointer"
                            >
                                Back to Assign
                            </button>
                        ) : (
                            <div></div> // Spacer
                        )}

                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className={`rounded-md px-4 py-2 text-sm font-medium text-white ${action === "Return" ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"} cursor-pointer`}
                            >
                                Confirm {action}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
