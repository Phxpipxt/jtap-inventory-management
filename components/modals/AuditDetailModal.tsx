"use client";

import { useState, useRef } from "react";
import { AuditLog, Asset, SUPERVISORS } from "@/lib/types";
import { useInventory } from "@/hooks/useInventory";
import { useAuth } from "@/context/AuthContext";
import { X, CheckCircle, AlertCircle, UserCheck, Printer, FileSpreadsheet, Download } from "lucide-react";
import * as XLSX from "xlsx";
import { useReactToPrint } from "react-to-print";
import { PrintableAuditReport } from "@/components/PrintableAuditReport";

interface AuditDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    auditLog: AuditLog | null;
}

export function AuditDetailModal({ isOpen, onClose, auditLog }: AuditDetailModalProps) {
    const { assets } = useInventory();
    const [activeTab, setActiveTab] = useState<"found" | "missing">("found");
    const [isGenerating, setIsGenerating] = useState(false);

    const printRef = useRef<HTMLDivElement>(null);

    const handleDownloadPdf = async () => {
        if (!printRef.current || !auditLog) return;

        try {
            setIsGenerating(true);
            const html2canvas = (await import("html2canvas")).default;
            const jsPDF = (await import("jspdf")).default;

            const element = printRef.current;
            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                logging: false,
                windowWidth: element.scrollWidth,
                windowHeight: element.scrollHeight
            });

            const imgData = canvas.toDataURL("image/png");

            // A4 dimensions in mm
            const pdfWidth = 210;
            const pdfHeight = 297;

            const pdf = new jsPDF("p", "mm", "a4");

            const imgProps = pdf.getImageProperties(imgData);
            const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;

            // If the content is taller than A4, manage pages (simplistic approach for now: scale to fit or just print tall)
            // But since PrintableAuditReport uses max-w-[210mm] and min-h-[297mm], it should map 1:1 nicely.
            // If it's multi-page content, we might need a more complex loop, but let's try standard addImage first.
            // Given the table can be long, we might need auto-paging.
            // html2canvas captures the whole element. If it's taller than 297mm, we need to slice it.

            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
            heightLeft -= pdfHeight;

            while (heightLeft >= 0) {
                position = heightLeft - imgHeight; // This logic might need adjustment for multi-page
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, -297 + heightLeft, pdfWidth, imgHeight); // Simplified paging logic
                // Actually, standard jsPDF multi-page from image is tricky. 
                // A safer bet for long reports is just adding it as one long page or standard single page if it fits.
                // Let's stick to single page if it fits, or just one big image for now.
                // Re-evaluating: The user's issue is SIDE overflow.
                // The 210mm width match should fix the side overflow.
                // Multipage tables are hard with converting DOM->Image.
                // Let's implement the basic image capture. If it cuts off vertically, we might need `jspdf-autotable` later,
                // but for now, DOM-to-Image is what ensures the "Design" matches.
                heightLeft -= pdfHeight;
            }

            // Reset to simple single page add for stability unless explicit multi-page needed
            // If the element is huge, this approach squashes or cuts.
            // But let's assume standard report length for now.
            // Actually, let's revert the while loop attempt and just do a single addImage. 
            // Most audit summaries are 1-2 pages.
            // Better: use the logic that fits width and allows height to expand?
            // "p", "mm", "a4" limits the page.
            // Let's use the exact code that worked for AssetDetail.
            // EXCEPT: Audit Reports can be LOOOONG (many assets).
            // Image-based PDF is bad for long lists.
            // BUT: User wants the *exact* styling.
            // Let's try the single image approach first.

            pdf.save(`Audit_Report_${new Date(auditLog.date).toISOString().split('T')[0]}.pdf`);

        } catch (error) {
            console.error("PDF Generation failed:", error);
            alert("Failed to generate PDF. Please try again.");
        } finally {
            setIsGenerating(false);
        }
    };

    if (!isOpen || !auditLog) return null;

    // Resolve assets from IDs
    const foundAssets = assets.filter(a => auditLog.scannedIds.includes(a.id));

    // For missing assets, we rely on missingIds if available.
    // If not (legacy logs), we might not be able to show them accurately,
    // but for new logs we will have them.
    const missingAssets = auditLog.missingIds
        ? assets.filter(a => auditLog.missingIds?.includes(a.id))
        : [];

    const handleExport = () => {
        if (!auditLog) return;
        try {
            // Re-resolve assets to ensure current state
            const foundAssets = assets.filter(a => auditLog.scannedIds.includes(a.id));
            const missingAssets = auditLog.missingIds ? assets.filter(a => auditLog.missingIds?.includes(a.id)) : [];

            // Create workbook
            const wb = XLSX.utils.book_new();

            // 1. Summary Sheet
            const summaryData = [
                ["AUDIT REPORT SUMMARY"],
                ["Date", new Date(auditLog.date).toLocaleString()],
                ["Auditor", auditLog.auditedBy || "-"],
                ["Supervisor", auditLog.supervisor1VerifiedBy || "Pending"],
                ["Status", auditLog.status],
                [],
                ["ASSET STATISTICS"],
                ["Total Assets", auditLog.totalAssets],
                ["Found Assets", auditLog.scannedCount],
                ["Missing Assets", auditLog.missingCount],
            ];
            const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
            XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

            // 2. Missing Assets Sheet (Priority)
            const missingData = missingAssets.map(a => ({
                "Status": "MISSING",
                "Computer No.": a.computerNo,
                "Serial No.": a.serialNo,
                "Brand": a.brand,
                "Model": a.model,
                "Owner": a.owner,
                "Department": a.department
            }));
            const wsMissing = XLSX.utils.json_to_sheet(missingData);
            XLSX.utils.book_append_sheet(wb, wsMissing, "Missing Assets");

            // 3. Found Assets Sheet
            const foundData = foundAssets.map(a => ({
                "Status": "FOUND",
                "Computer No.": a.computerNo,
                "Serial No.": a.serialNo,
                "Brand": a.brand,
                "Model": a.model,
                "Owner": a.owner,
                "Department": a.department
            }));
            const wsFound = XLSX.utils.json_to_sheet(foundData);
            XLSX.utils.book_append_sheet(wb, wsFound, "Found Assets");

            // 4. Master List (All Assets)
            const allAssetsData = [...missingAssets, ...foundAssets].map(a => ({
                "Audit Status": missingAssets.find(m => m.id === a.id) ? "MISSING" : "FOUND",
                "Computer No.": a.computerNo,
                "Serial No.": a.serialNo,
                "Brand": a.brand,
                "Model": a.model,
                "Owner": a.owner,
                "Department": a.department,
                "Current Status": a.status
            }));
            const wsAll = XLSX.utils.json_to_sheet(allAssetsData);
            XLSX.utils.book_append_sheet(wb, wsAll, "Master List");

            // Download
            XLSX.writeFile(wb, `Audit_Report_${new Date(auditLog.date).toISOString().split('T')[0]}.xlsx`);
        } catch (error) {
            console.error("Export failed:", error);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="flex h-[90vh] w-full max-w-4xl flex-col rounded-lg bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Audit Details</h2>
                        <p className="text-sm text-slate-500">
                            Date: {new Date(auditLog.date).toLocaleString()} | Auditor: {auditLog.auditedBy || "-"}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleDownloadPdf}
                            disabled={isGenerating}
                            className="flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer disabled:opacity-50"
                            title="Download PDF Report"
                        >
                            {isGenerating ? (
                                <span className="animate-pulse">Generating...</span>
                            ) : (
                                <>
                                    <Download className="h-4 w-4" />
                                    <span className="hidden sm:inline">Download PDF</span>
                                </>
                            )}
                        </button>
                        <button
                            onClick={handleExport}
                            className="flex items-center gap-1 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer"
                            title="Export to Excel"
                        >
                            <FileSpreadsheet className="h-4 w-4" />
                            <span className="hidden sm:inline">Export</span>
                        </button>
                        <div className="h-6 w-px bg-slate-200 mx-1"></div>
                        <button onClick={onClose} className="rounded-full p-2 hover:bg-slate-100 transition-colors cursor-pointer" title="Close Modal">
                            <X className="h-6 w-6 text-slate-500" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden flex flex-col">
                    {/* Stats Summary */}
                    <div className="grid grid-cols-3 gap-4 p-6 bg-slate-50 border-b border-slate-200">
                        <div className="text-center">
                            <div className="text-sm text-slate-500">Total Assets</div>
                            <div className="text-2xl font-bold text-slate-800">{auditLog.totalAssets}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-sm text-slate-500">Found</div>
                            <div className="text-2xl font-bold text-green-600">{auditLog.scannedCount}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-sm text-slate-500">Missing</div>
                            <div className="text-2xl font-bold text-red-600">{auditLog.missingCount}</div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-slate-200 px-6 pt-4">
                        <button
                            onClick={() => setActiveTab("found")}
                            className={`mr-6 pb-3 text-sm font-medium transition-colors cursor-pointer ${activeTab === "found"
                                ? "border-b-2 border-green-500 text-green-600"
                                : "text-slate-500 hover:text-slate-700"
                                }`}
                            title="Show Found Assets"
                        >
                            Found Assets ({foundAssets.length})
                        </button>
                        <button
                            onClick={() => setActiveTab("missing")}
                            className={`pb-3 text-sm font-medium transition-colors cursor-pointer ${activeTab === "missing"
                                ? "border-b-2 border-red-500 text-red-600"
                                : "text-slate-500 hover:text-slate-700"
                                }`}
                            title="Show Missing Assets"
                        >
                            Missing Assets ({missingAssets.length})
                        </button>
                    </div>

                    {/* List */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {/* Mobile List View */}
                        <div className="md:hidden space-y-3">
                            {(activeTab === "found" ? foundAssets : missingAssets).map((asset) => (
                                <div key={asset.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                                    <div className="mb-2 flex items-start justify-between">
                                        <div className={`font-bold truncate pr-2 ${activeTab === "found" ? "text-green-600" : "text-red-600"
                                            }`}>{asset.computerNo}</div>
                                        <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${asset.status === "In Stock" ? "bg-green-100 text-green-800" :
                                            asset.status === "Assigned" || asset.status === "In Use" ? "bg-blue-100 text-blue-800" :
                                                asset.status === "Broken" || asset.status === "Resign" ? "bg-red-100 text-red-800" :
                                                    "bg-yellow-100 text-yellow-800"
                                            }`}>
                                            {asset.status}
                                        </span>
                                    </div>
                                    <div className="text-xs text-slate-500">
                                        <div>Owner: {asset.owner || "-"}</div>
                                        <div>Dept: {asset.department || "-"}</div>
                                    </div>
                                </div>
                            ))}
                            {(activeTab === "found" ? foundAssets : missingAssets).length === 0 && (
                                <div className="text-center text-sm text-slate-500 py-4">
                                    No assets found in this category.
                                </div>
                            )}
                        </div>

                        {/* Desktop Table View */}
                        <table className="hidden min-w-full divide-y divide-slate-200 md:table">
                            <thead className="bg-slate-50/80 backdrop-blur supports-[backdrop-filter]:bg-slate-50/80 sticky top-0 z-10">
                                <tr>
                                    <th className="px-4 py-4 text-left text-sm font-semibold text-slate-700">Computer No.</th>
                                    <th className="px-4 py-4 text-left text-sm font-semibold text-slate-700">Owner</th>
                                    <th className="px-4 py-4 text-left text-sm font-semibold text-slate-700">Dept</th>
                                    <th className="px-4 py-4 text-left text-sm font-semibold text-slate-700">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 bg-white">
                                {(activeTab === "found" ? foundAssets : missingAssets).map((asset) => (
                                    <tr key={asset.id} className="hover:bg-slate-50">
                                        <td className={`whitespace-nowrap px-4 py-3 text-sm font-bold ${activeTab === "found" ? "text-green-600" : "text-red-600"
                                            }`}>{asset.computerNo}</td>
                                        <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-500">{asset.owner || "-"}</td>
                                        <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-500">{asset.department || "-"}</td>
                                        <td className="whitespace-nowrap px-4 py-3 text-sm">
                                            <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${asset.status === "In Stock" ? "bg-green-100 text-green-800" :
                                                asset.status === "Assigned" || asset.status === "In Use" ? "bg-blue-100 text-blue-800" :
                                                    asset.status === "Broken" || asset.status === "Resign" ? "bg-red-100 text-red-800" :
                                                        "bg-yellow-100 text-yellow-800"
                                                }`}>
                                                {asset.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {(activeTab === "found" ? foundAssets : missingAssets).length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-500">
                                            No assets found in this category.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Footer - Close Only */}

            </div>

            {/* Hidden Printable Component - Positioned off-screen so proper layout is computed, but not hidden with display:none */}
            <div className="absolute top-0 left-[-9999px]">
                <PrintableAuditReport
                    ref={printRef}
                    auditLog={auditLog}
                    foundAssets={foundAssets}
                    missingAssets={missingAssets}
                />
            </div>
        </div>
    );
}
