"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Asset, Department, PERSONS_IN_CHARGE } from "@/lib/types";
import { X } from "lucide-react";

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
            owner: action === "Return" ? undefined : owner,
            empId: action === "Return" ? undefined : empId,
            department: action === "Return" ? undefined : (department as Department),
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
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-800">
                        {action === "Return" ? "Return Asset" : "Assign Asset"}: {asset.computerNo}
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                        <X className="h-6 w-6" />
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
                                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-black focus:border-blue-500 focus:outline-none"
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
                                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-black focus:border-blue-500 focus:outline-none"
                                    required
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">Department</label>
                                <select
                                    value={department}
                                    onChange={(e) => setDepartment(e.target.value as Department)}
                                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-black focus:border-blue-500 focus:outline-none"
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
                        <div className="rounded-md bg-yellow-50 p-4 text-sm text-yellow-800">
                            <p className="font-medium">Return to Stock?</p>
                            <p className="mt-1">This will clear the current owner information and set the status to "In Stock".</p>
                            <div className="mt-2 text-xs text-slate-500">
                                Current Owner: <span className="font-medium text-slate-700">{asset.owner}</span>
                            </div>
                        </div>
                    )}

                    <div className="mt-4">
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                            Person In Charge
                        </label>
                        <div className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700">
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
                                className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 cursor-pointer"
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
