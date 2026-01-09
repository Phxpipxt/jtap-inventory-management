"use client";

import Link from "next/link";
import { useInventory } from "@/hooks/useInventory";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Package, CheckCircle, User, History, Clock, FileText, Repeat } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { motion } from "framer-motion";

export default function DashboardPage() {
    const { assets, logs, loading } = useInventory();

    if (loading) return <div className="p-8">Loading...</div>;

    const totalAssets = assets.length;
    const inStock = assets.filter((a) => a.status === "In Stock").length;

    // Calculate Second Hand Assets
    const secondHandCount = assets.filter(asset =>
        logs.some(log => log.assetId === asset.id && log.action === "Check-in")
    ).length;

    const inUse = assets.filter((a) => a.status === "In Use").length;
    const broken = assets.filter((a) => a.status === "Broken").length;
    const maintenance = assets.filter((a) => a.status === "Maintenance").length;

    const statusData = [
        { name: "In Stock", value: inStock, color: "#22c55e" },
        { name: "Assigned", value: inUse, color: "#3b82f6" },
        { name: "Broken", value: broken, color: "#ef4444" },
        { name: "Maintenance", value: maintenance, color: "#f59e0b" },
    ].filter((d) => d.value > 0);

    // Calculate Average Age
    const now = new Date();
    const assetsWithAge = assets.filter(a => a.purchaseDate);
    const totalAgeDays = assetsWithAge.reduce((sum, asset) => {
        const purchase = new Date(asset.purchaseDate!);
        const diffTime = Math.abs(now.getTime() - purchase.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return sum + diffDays;
    }, 0);
    const averageAgeDays = assetsWithAge.length ? Math.round(totalAgeDays / assetsWithAge.length) : 0;
    const averageAgeYears = (averageAgeDays / 365).toFixed(1);

    // Warranty Check (Expiring in 30 days)
    const expiringWarrantyCount = assets.filter(a => {
        if (!a.warrantyExpiry) return false;
        const expiry = new Date(a.warrantyExpiry);
        const diffTime = expiry.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 && diffDays <= 30;
    }).length;

    const handleExportPDF = () => {
        const doc = new jsPDF();
        doc.text("Inventory Asset Report", 14, 15);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 22);

        const tableData = assets.map(a => [
            a.computerNo,
            a.serialNo,
            a.owner || "-",
            a.department || "-",
            a.status,
            a.warrantyExpiry || "-"
        ]);

        autoTable(doc, {
            head: [["Asset Tag", "Serial", "Owner", "Dept", "Status", "Warranty"]],
            body: tableData,
            startY: 30,
        });

        doc.save("inventory_report.pdf");
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6 pb-20 md:pb-0 font-inter"
        >
            <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>

            <div className="grid gap-6 md:grid-cols-4">
                <div className="rounded-lg bg-white p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4">
                        <div className="rounded-full bg-slate-100 p-3">
                            <Package className="h-6 w-6 text-slate-600" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-600">Total Assets</p>
                            <p className="text-2xl font-bold text-slate-900">{totalAssets}</p>
                        </div>
                    </div>
                </div>
                <div className="rounded-lg bg-white p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4">
                        <div className="rounded-full bg-emerald-50 p-3">
                            <CheckCircle className="h-6 w-6 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-emerald-600">In Stock</p>
                            <p className="text-2xl font-bold text-slate-900">{inStock}</p>
                        </div>
                    </div>
                </div>
                <div className="rounded-lg bg-white p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4">
                        <div className="rounded-full bg-blue-50 p-3">
                            <User className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-blue-600">In Use</p>
                            <p className="text-2xl font-bold text-slate-900">{inUse}</p>
                        </div>
                    </div>
                </div>
                <div className="rounded-lg bg-white p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4">
                        <div className="rounded-full bg-orange-50 p-3">
                            <Repeat className="h-6 w-6 text-orange-600" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-orange-600">Second-hand</p>
                            <p className="text-2xl font-bold text-slate-900">{secondHandCount}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-lg bg-white p-6 shadow-sm">
                    <h2 className="mb-4 text-lg font-semibold text-slate-800">Asset Status Distribution</h2>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={statusData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {statusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="rounded-lg bg-white p-6 shadow-sm">
                    <h2 className="mb-4 text-lg font-semibold text-slate-800">Quick Actions</h2>
                    <div className="grid gap-4">
                        <Link href="/audit" className="block cursor-pointer">
                            <div className="flex items-center justify-between rounded-md border border-slate-200 p-4 hover:bg-slate-50 transition-colors">
                                <span className="font-medium text-slate-700">Audit Stock</span>
                                <Clock className="h-5 w-5 text-slate-400" />
                            </div>
                        </Link>
                        <button
                            onClick={handleExportPDF}
                            className="hidden md:flex items-center justify-between rounded-md border border-slate-200 p-4 hover:bg-slate-50 cursor-pointer"
                        >
                            <span className="font-medium text-slate-700">Export Report (PDF)</span>
                            <FileText className="h-5 w-5 text-slate-400" />
                        </button>
                    </div>
                </div>

            </div>
        </motion.div>
    );
}
