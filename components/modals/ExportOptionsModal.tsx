
"use client";

import { useState, useRef } from "react";
import { Asset } from "@/lib/types";
import { X, Printer, Download, Check, HardDrive, Cpu, MemoryStick, Image as ImageIcon, Activity } from "lucide-react";
import { useReactToPrint } from "react-to-print";
import { PrintableAssetDetail } from "@/components/PrintableAssetDetail";

interface ExportOptionsModalProps {
    asset: Asset | null;
    isOpen: boolean;
    onClose: () => void;
}

export function ExportOptionsModal({ asset, isOpen, onClose }: ExportOptionsModalProps) {
    const [options, setOptions] = useState({
        showCondition: true,
        showHdd: true,
        showRam: true,
        showCpu: true,
        showImages: true,
    });
    const [isGenerating, setIsGenerating] = useState(false);

    const printRef = useRef<HTMLDivElement>(null);

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: asset ? `Asset_Detail_${asset.computerNo}` : "Asset_Detail",
    });

    const handleDownloadPdf = async () => {
        if (!printRef.current || !asset) return;

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

            const pdfWidth = 210;
            const pdfHeight = 297;
            const pdf = new jsPDF("p", "mm", "a4");

            const imgProps = pdf.getImageProperties(imgData);
            const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;

            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, "PNG", 0, position, pdfWidth, imgHeight);
            heightLeft -= pdfHeight;

            while (heightLeft > 5) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, "PNG", 0, position, pdfWidth, imgHeight);
                heightLeft -= pdfHeight;
            }

            pdf.save(`Asset_Detail_${asset.computerNo}.pdf`);

        } catch (error) {
            console.error("PDF Generation failed:", error);
            alert(`Failed to generate PDF: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setIsGenerating(false);
        }
    };

    if (!isOpen || !asset) return null;

    const OptionCard = ({
        label,
        icon: Icon,
        checked,
        onChange
    }: {
        label: string;
        icon: any;
        checked: boolean;
        onChange: (val: boolean) => void
    }) => (
        <div
            onClick={() => onChange(!checked)}
            className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer group ${checked
                ? 'border-blue-500 bg-blue-50/50 shadow-sm'
                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
        >
            <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg transition-colors ${checked ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'}`}>
                    <Icon className="w-5 h-5" />
                </div>
                <span className={`font-medium transition-colors ${checked ? 'text-blue-900' : 'text-slate-600'}`}>
                    {label}
                </span>
            </div>
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${checked
                ? 'border-blue-500 bg-blue-500'
                : 'border-slate-300 bg-white group-hover:border-slate-400'
                }`}>
                <Check className={`w-3.5 h-3.5 text-white transition-transform ${checked ? 'scale-100' : 'scale-0'}`} />
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="flex w-full max-w-6xl flex-col rounded-2xl bg-white shadow-2xl h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 px-8 py-5 bg-white z-10">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Export Asset Detail</h2>
                        <p className="text-sm text-slate-500 mt-1">Customize your report and preview the output.</p>
                    </div>
                    <button onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Left Panel: Options */}
                    <div className="w-full lg:w-[350px] lg:min-w-[350px] border-r border-slate-100 flex flex-col bg-white z-10 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)]">
                        <div className="p-6 sm:p-8 space-y-6 flex-1 overflow-y-auto">
                            <div>
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">Report Content</h3>

                                <div className="space-y-3">
                                    <OptionCard
                                        label="Condition Status"
                                        icon={Activity}
                                        checked={options.showCondition}
                                        onChange={(v) => setOptions({ ...options, showCondition: v })}
                                    />
                                    <OptionCard
                                        label="Hard Drive (Storage)"
                                        icon={HardDrive}
                                        checked={options.showHdd}
                                        onChange={(v) => setOptions({ ...options, showHdd: v })}
                                    />
                                    <OptionCard
                                        label="Memory (RAM)"
                                        icon={MemoryStick}
                                        checked={options.showRam}
                                        onChange={(v) => setOptions({ ...options, showRam: v })}
                                    />
                                    <OptionCard
                                        label="Processor (CPU)"
                                        icon={Cpu}
                                        checked={options.showCpu}
                                        onChange={(v) => setOptions({ ...options, showCpu: v })}
                                    />
                                    <OptionCard
                                        label="Asset Images"
                                        icon={ImageIcon}
                                        checked={options.showImages}
                                        onChange={(v) => setOptions({ ...options, showImages: v })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Footer Buttons */}
                        <div className="p-6 border-t border-slate-100 bg-slate-50/80 backdrop-blur space-y-3">
                            <button
                                onClick={handleDownloadPdf}
                                disabled={isGenerating}
                                className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3.5 text-sm font-bold text-white hover:bg-red-700 shadow-lg shadow-red-200 transition-all hover:shadow-red-300 hover:-translate-y-0.5 disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none cursor-pointer"
                            >
                                {isGenerating ? (
                                    <span className="flex items-center gap-2">
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                                        Generating...
                                    </span>
                                ) : (
                                    <>
                                        <Download className="h-4 w-4" />
                                        Download PDF
                                    </>
                                )}
                            </button>
                            <button
                                onClick={handlePrint}
                                className="hidden sm:flex w-full items-center justify-center gap-2 rounded-xl bg-white border border-slate-200 px-4 py-3.5 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-sm transition-all cursor-pointer"
                            >
                                <Printer className="h-4 w-4" />
                                Print
                            </button>
                        </div>
                    </div>

                    {/* Right Panel: Preview (Hidden on Mobile) */}
                    <div className="hidden lg:flex flex-1 bg-slate-100/50 relative overflow-hidden items-center justify-center">
                        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-50"></div>

                        {/* Scale Wrapper */}
                        <div
                            className="bg-white shadow-2xl transition-all duration-300 origin-center"
                            style={{
                                width: '210mm',
                                height: '297mm',
                                transform: 'scale(0.55)', // Fixed scale to fit comfortably on most screens
                                flexShrink: 0
                            }}
                        >
                            {/* Visual Preview */}
                            <div className="h-full w-full overflow-hidden">
                                <PrintableAssetDetail
                                    asset={asset}
                                    options={options}
                                />
                            </div>
                        </div>

                        <div className="absolute bottom-6 bg-black/75 backdrop-blur-md text-white px-4 py-2 rounded-full text-xs font-medium shadow-lg pointer-events-none">
                            A4 Preview
                        </div>
                    </div>
                </div>
            </div>

            {/* Hidden Printable Component - For Capture */}
            <div className="fixed top-0 left-0 opacity-0 -z-50 pointer-events-none">
                <PrintableAssetDetail
                    ref={printRef}
                    asset={asset}
                    options={options}
                />
            </div>
        </div>
    );
}
