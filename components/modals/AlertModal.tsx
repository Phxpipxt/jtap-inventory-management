"use client";

import { X, AlertCircle, CheckCircle, Info } from "lucide-react";

interface AlertModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    message: React.ReactNode;
    type?: "default" | "error" | "success" | "warning";
    showCancel?: boolean;
    onConfirm?: () => void;
    confirmText?: string;
    cancelText?: string;
}

export function AlertModal({ isOpen, onClose, title, message, type = "default", showCancel, onConfirm, confirmText, cancelText }: AlertModalProps) {
    if (!isOpen) return null;

    const getIcon = () => {
        switch (type) {
            case "error":
                return <AlertCircle className="h-6 w-6 text-red-600" />;
            case "success":
                return <CheckCircle className="h-6 w-6 text-green-600" />;
            case "warning":
                return <AlertCircle className="h-6 w-6 text-orange-600" />;
            default:
                return <Info className="h-6 w-6 text-blue-600" />;
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
            <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
                <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {getIcon()}
                        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <p className="mb-6 text-slate-600 whitespace-pre-wrap">{message}</p>
                <div className="flex justify-end gap-2">
                    {showCancel && (
                        <button
                            onClick={onClose}
                            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50 cursor-pointer"
                        >
                            {cancelText || "Cancel"}
                        </button>
                    )}
                    <button
                        onClick={() => {
                            if (onConfirm) onConfirm();
                            onClose();
                        }}
                        className={`rounded-md px-4 py-2 text-white ${type === "error" ? "bg-red-600 hover:bg-red-700" :
                            type === "warning" ? "bg-orange-600 hover:bg-orange-700" :
                                "bg-blue-600 hover:bg-blue-700"
                            } cursor-pointer`}
                    >
                        {confirmText || "OK"}
                    </button>
                </div>
            </div>
        </div>
    );
}
