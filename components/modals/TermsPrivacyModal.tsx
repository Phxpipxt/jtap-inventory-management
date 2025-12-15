"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";

interface TermsPrivacyModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: "terms" | "privacy";
}

export function TermsPrivacyModal({ isOpen, onClose, type }: TermsPrivacyModalProps) {
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener("keydown", handleEscape);
            document.body.style.overflow = "hidden";
        }

        return () => {
            document.removeEventListener("keydown", handleEscape);
            document.body.style.overflow = "unset";
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const title = type === "terms" ? "Terms of Service" : "Privacy Policy";
    const lastUpdated = new Date().toLocaleDateString();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
            <div
                ref={modalRef}
                className="w-full max-w-3xl rounded-lg bg-white shadow-xl max-h-[90vh] flex flex-col"
            >
                <div className="flex items-center justify-between border-b border-slate-200 p-6">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">{title}</h2>
                        <p className="text-sm text-slate-500">Last updated: {lastUpdated}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 text-slate-700 space-y-6">
                    {type === "terms" ? (
                        <>
                            <section>
                                <h3 className="mb-2 text-lg font-semibold text-slate-900">1. Acceptance of Terms</h3>
                                <p>
                                    By accessing and using the JTAP Inventory Asset Management System ("the System"), you agree to comply with and be bound by these Terms of Service. This System is intended solely for official business use by authorized personnel of JTEKT ASIA PACIFIC CO., LTD.
                                </p>
                            </section>

                            <section>
                                <h3 className="mb-2 text-lg font-semibold text-slate-900">2. Asset Responsibility</h3>
                                <p>
                                    Employees are responsible for the proper care and security of all company assets assigned to them. This includes:
                                </p>
                                <ul className="mt-2 list-disc pl-5 space-y-1">
                                    <li>Protecting assets from theft, damage, or misuse.</li>
                                    <li>Not installing unauthorized software on company computers.</li>
                                    <li>Returning assets upon request or termination of employment.</li>
                                </ul>
                            </section>

                            <section>
                                <h3 className="mb-2 text-lg font-semibold text-slate-900">3. Reporting Obligations</h3>
                                <p>
                                    Any loss, damage, or malfunction of assigned assets must be reported immediately to the IT or Management Information System (MIS) department. Failure to report may result in disciplinary action.
                                </p>
                            </section>

                            <section>
                                <h3 className="mb-2 text-lg font-semibold text-slate-900">4. System Usage</h3>
                                <p>
                                    The System is provided for inventory tracking and management purposes. Users must not:
                                </p>
                                <ul className="mt-2 list-disc pl-5 space-y-1">
                                    <li>Attempt to gain unauthorized access to the System.</li>
                                    <li>Modify or delete data without proper authorization.</li>
                                    <li>Share login credentials with others.</li>
                                </ul>
                            </section>

                            <section>
                                <h3 className="mb-2 text-lg font-semibold text-slate-900">5. Modifications</h3>
                                <p>
                                    We reserve the right to modify these terms at any time. Continued use of the System constitutes acceptance of any changes.
                                </p>
                            </section>
                        </>
                    ) : (
                        <>
                            <section>
                                <h3 className="mb-2 text-lg font-semibold text-slate-900">1. Information Collection</h3>
                                <p>
                                    The JTAP Inventory Asset Management System collects specific information to effectively track and manage company assets. This includes:
                                </p>
                                <ul className="mt-2 list-disc pl-5 space-y-1">
                                    <li>Employee Name and ID</li>
                                    <li>Department</li>
                                    <li>Asset assignment history</li>
                                    <li>System usage logs (login times, actions performed)</li>
                                </ul>
                            </section>

                            <section>
                                <h3 className="mb-2 text-lg font-semibold text-slate-900">2. Use of Information</h3>
                                <p>
                                    The collected information is used strictly for:
                                </p>
                                <ul className="mt-2 list-disc pl-5 space-y-1">
                                    <li>Tracking the location and status of company assets.</li>
                                    <li>Conducting inventory audits.</li>
                                    <li>Ensuring accountability for assigned equipment.</li>
                                    <li>System security and maintenance.</li>
                                </ul>
                            </section>

                            <section>
                                <h3 className="mb-2 text-lg font-semibold text-slate-900">3. Data Protection</h3>
                                <p>
                                    We implement appropriate security measures to protect your personal information and asset data from unauthorized access, alteration, disclosure, or destruction. Access to sensitive data is restricted to authorized personnel only.
                                </p>
                            </section>

                            <section>
                                <h3 className="mb-2 text-lg font-semibold text-slate-900">4. Data Sharing</h3>
                                <p>
                                    Your data is internal to JTEKT ASIA PACIFIC CO., LTD. and is not shared with third parties unless required by law or for necessary business operations (e.g., warranty claims with vendors).
                                </p>
                            </section>

                            <section>
                                <h3 className="mb-2 text-lg font-semibold text-slate-900">5. Contact Us</h3>
                                <p>
                                    If you have any questions about this Privacy Policy or data practices, please contact the Management Information System (MIS) Department.
                                </p>
                            </section>
                        </>
                    )}
                </div>

                <div className="border-t border-slate-200 p-6 flex justify-end">
                    <button
                        onClick={onClose}
                        className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition-colors shadow-sm cursor-pointer"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
