"use client";

import { useState, useRef, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useInventory } from "@/hooks/useInventory";
import { useResizableColumns } from "@/hooks/useResizableColumns";

import { calculateAssetAge } from "@/lib/utils";
import { Asset, AssetStatus, Department, BRANDS, PersonInCharge, PERSONS_IN_CHARGE } from "@/lib/types";
import { Search, Filter, Plus, Download, UserCog, Upload, Pencil, Trash2, X, Box, CheckCircle2, User, History, RotateCcw, ArrowRight, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";

import { AssignmentModal } from "@/components/modals/AssignmentModal";
import { AddAssetModal } from "@/components/modals/AddAssetModal";
import { ImportModal } from "@/components/modals/ImportModal";
import { EditAssetModal } from "@/components/modals/EditAssetModal";
import { AlertModal } from "@/components/modals/AlertModal";
import { AssetDetailModal } from "@/components/modals/AssetDetailModal";
import { AssetHistoryModal } from "@/components/modals/AssetHistoryModal";
import { useAuth } from "@/context/AuthContext";
import { Eye } from "lucide-react";
import { DashboardSkeleton } from "@/components/skeletons/AppSkeletons";
import { motion } from "framer-motion";

function InventoryContent() {
    const { assets, logs, loading, addAsset, updateAsset, deleteAsset, deleteAssets } = useInventory();
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const initialStatus = searchParams.get("status") as AssetStatus | "All" | null;

    const [searchTerm, setSearchTerm] = useState("");
    const [departmentFilter, setDepartmentFilter] = useState<Department | "All">("All");
    const [statusFilter, setStatusFilter] = useState<AssetStatus | "All">("All");
    const [lifecycleFilter, setLifecycleFilter] = useState<"More than 5 Years" | "Less than 5 Years" | "All">("All");

    // Initialize status filter from URL if present
    useEffect(() => {
        if (initialStatus) {
            setStatusFilter(initialStatus);
        }
    }, [initialStatus]);

    // Sorting State
    const [sortConfig, setSortConfig] = useState<{ key: keyof Asset | "dept" | "warranty" | null; direction: "asc" | "desc" }>({ key: "computerNo", direction: "asc" });

    const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    const [assetToEdit, setAssetToEdit] = useState<Asset | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const [assetToView, setAssetToView] = useState<Asset | null>(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);

    const [assetToHistory, setAssetToHistory] = useState<Asset | null>(null);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

    // Delete Modal State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [assetsToDelete, setAssetsToDelete] = useState<Asset[]>([]);
    const [deleteReason, setDeleteReason] = useState("");

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState<number | "All">(10);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Resizable Columns State
    const { columnWidths, startResizing } = useResizableColumns({
        checkbox: "50px",
        computerNo: "150px",
        brand: "120px",
        owner: "150px",
        dept: "100px",
        status: "100px",
        age: "100px",
        actions: "120px",
    });



    const [activeTab, setActiveTab] = useState<"active" | "disposed">("active");

    const filteredAssets = useMemo(() => {
        let result = assets.filter((asset) => {
            const matchesSearch =
                asset.computerNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                asset.serialNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                asset.owner?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesDept = departmentFilter === "All" || asset.department === departmentFilter;
            const matchesStatus = statusFilter === "All" || asset.status === statusFilter;

            let matchesLifecycle = true;
            if (lifecycleFilter !== "All") {
                const age = calculateAssetAge(asset.purchaseDate).years;
                if (lifecycleFilter === "More than 5 Years") {
                    matchesLifecycle = age >= 5;
                } else {
                    matchesLifecycle = age < 5;
                }
            }

            // Tab Filtering
            let matchesTab = true;
            if (activeTab === "active") {
                matchesTab = asset.status !== "Disposed";
            } else {
                matchesTab = asset.status === "Disposed";
            }

            return matchesSearch && matchesDept && matchesStatus && matchesLifecycle && matchesTab;
        });

        if (sortConfig.key) {
            result.sort((a, b) => {
                let aValue: any = a[sortConfig.key as keyof Asset];
                let bValue: any = b[sortConfig.key as keyof Asset];

                // Handle special keys mapping
                if (sortConfig.key === "dept") {
                    aValue = a.department;
                    bValue = b.department;
                } else if (sortConfig.key === "warranty") {
                    aValue = a.warrantyExpiry;
                    bValue = b.warrantyExpiry;
                }

                // Handle null/undefined
                if (!aValue) return 1;
                if (!bValue) return -1;

                if (aValue < bValue) {
                    return sortConfig.direction === "asc" ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === "asc" ? 1 : -1;
                }
                return 0;
            });
        }

        return result;
    }, [assets, searchTerm, departmentFilter, statusFilter, lifecycleFilter, sortConfig, activeTab]);

    const handleSort = (key: keyof Asset | "dept" | "warranty") => {
        setSortConfig((current) => {
            if (current.key === key) {
                return { key, direction: current.direction === "asc" ? "desc" : "asc" };
            }
            return { key, direction: "asc" };
        });
    };

    // Pagination Logic
    const totalItems = filteredAssets.length;
    const totalPages = itemsPerPage === "All" ? 1 : Math.ceil(totalItems / itemsPerPage);

    const paginatedAssets = useMemo(() => {
        return itemsPerPage === "All"
            ? filteredAssets
            : filteredAssets.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    }, [filteredAssets, itemsPerPage, currentPage]);

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value === "All" ? "All" : Number(e.target.value);
        setItemsPerPage(value);
        setCurrentPage(1); // Reset to first page
    };

    // Bulk Selection Logic
    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            const newSelected = new Set(selectedIds);
            paginatedAssets.forEach(a => newSelected.add(a.id));
            setSelectedIds(newSelected);
        } else {
            const newSelected = new Set(selectedIds);
            paginatedAssets.forEach(a => newSelected.delete(a.id));
            setSelectedIds(newSelected);
        }
    };

    const handleSelectRow = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    // Alert Modal State
    const [alertState, setAlertState] = useState<{
        isOpen: boolean;
        title: string;
        message: string | React.ReactNode;
        type: "default" | "error" | "warning";
        showCancel?: boolean;
        onConfirm?: () => void;
        confirmText?: string;
        cancelText?: string;
    }>({
        isOpen: false,
        title: "",
        message: "",
        type: "default",
        showCancel: false,
    });

    const showAlert = (title: string, message: React.ReactNode, type: "default" | "error" | "warning" = "default") => {
        setAlertState({ isOpen: true, title, message, type, showCancel: false });
    };

    const showConfirm = (
        title: string,
        message: React.ReactNode,
        onConfirm: () => void,
        confirmText = "OK",
        cancelText = "Cancel"
    ) => {
        setAlertState({
            isOpen: true,
            title,
            message,
            type: "warning",
            showCancel: true,
            onConfirm,
            confirmText,
            cancelText
        });
    };

    const handleBulkDeleteClick = () => {
        const assets = paginatedAssets.filter(a => selectedIds.has(a.id));

        const assignedAssets = assets.filter(a => a.status === "In Use" || a.owner);
        const deletableAssets = assets.filter(a => a.status !== "In Use" && !a.owner);

        if (assignedAssets.length > 0) {
            // Case 1: Some assigned, some deletable (Mixed)
            if (deletableAssets.length > 0) {
                showConfirm(
                    "Assigned Assets Selected",
                    <span>
                        <span className="font-bold text-red-600">{assignedAssets.length}</span> assets are currently assigned and cannot be deleted.
                        <br />
                        Do you want to skip them and delete the remaining <span className="font-bold">{deletableAssets.length}</span> assets?
                    </span>,
                    () => {
                        // Proceed with only deletable assets
                        setAssetsToDelete(deletableAssets);
                        setIsDeleteModalOpen(true);
                    },
                    "Skip & Delete",
                    "Cancel"
                );
                return;
            }

            // Case 2: All assigned (None deletable)
            const assetList = assignedAssets.map(a => `${a.computerNo} (${a.owner})`).join("\n");
            showAlert(
                "Cannot Delete Assigned Assets",
                <span>
                    Please return the following assets to stock first:
                    <br /><br />
                    <span className="font-bold text-slate-800 whitespace-pre-wrap">{assetList}</span>
                </span>,
                "error"
            );
            return;
        }

        // Case 3: All deletable
        setAssetsToDelete(assets);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = () => {
        if (!user?.name) {
            showAlert("Authentication Error", "You must be logged in to delete assets.", "error");
            return;
        }

        if (assetsToDelete.length === 1) {
            deleteAsset(assetsToDelete[0].id, user.name, deleteReason);
        } else {
            deleteAssets(assetsToDelete.map(a => a.id), user.name, deleteReason);
            setSelectedIds(new Set());
        }
        setIsDeleteModalOpen(false);
        setAssetsToDelete([]);
        setDeleteReason("");
    };

    const isAllSelected = paginatedAssets.length > 0 && paginatedAssets.every(a => selectedIds.has(a.id));

    const handleExport = async () => {
        if (filteredAssets.length === 0) {
            showAlert("Export Failed", "No assets to export.", "warning");
            return;
        }

        try {
            const XLSX = await import("xlsx");

            const data = filteredAssets.map((asset) => ({
                "Computer No.": asset.computerNo,
                "Serial No.": asset.serialNo,
                Brand: asset.brand || "-",
                Model: asset.model || "-",
                Owner: asset.owner || "-",
                "Emp ID": asset.empId || "-",
                Department: asset.department || "-",
                Status: asset.status,
                "Last Updated": new Date(asset.lastUpdated).toLocaleString(),
                "Updated By": asset.updatedBy,
            }));

            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Inventory");
            XLSX.writeFile(wb, `Inventory_Export_${new Date().toISOString().split("T")[0]}.xlsx`);
        } catch (error) {
            console.error("Export failed:", error);
            showAlert("Export Failed", "Failed to export inventory. Please try again.", "error");
        }
    };

    const handleAssignClick = (asset: Asset) => {
        if (asset.status === "Disposed") {
            showAlert(
                "Cannot Assign Disposed Asset",
                <div className="flex flex-col gap-4">
                    <p className="text-slate-600 leading-relaxed">
                        This asset is currently marked as <span className="font-semibold text-red-600">Disposed</span>.
                        <br />
                        To assign it, you must first restore it to stock.
                    </p>
                    <Link
                        href="/dispose?tab=disposed"
                        className="group flex items-center justify-between rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200 transition-all hover:bg-white hover:shadow-md hover:ring-blue-100 cursor-pointer"
                    >
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                <RotateCcw className="h-5 w-5" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-semibold text-slate-900 group-hover:text-blue-700">Restore Asset</span>
                                <span className="text-xs text-slate-500">Go to Disposal Management</span>
                            </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                    </Link>
                </div>,
                "warning"
            );
            return;
        }
        setSelectedAsset(asset);
        setIsModalOpen(true);
    };



    const handleSaveAssignment = (updatedAsset: Asset) => {
        let details = "";
        if (updatedAsset.status === "In Use") {
            details = `Assigned to ${updatedAsset.owner} (ID: ${updatedAsset.empId || "N/A"}, Dept: ${updatedAsset.department})`;
        } else {
            // If returning, we want to know who it was returned FROM.
            // The `updatedAsset` (from modal) has owner cleared.
            // But `selectedAsset` (original state) has the previous owner.
            const previousOwner = selectedAsset?.owner || "Unknown";
            details = `Returned from ${previousOwner}`;
        }

        updateAsset(updatedAsset, updatedAsset.updatedBy || "admin", updatedAsset.status === "In Use" ? "Check-out" : "Check-in", details);
        setIsModalOpen(false);
        setSelectedAsset(null);
    };

    const handleEditClick = (asset: Asset) => {
        setAssetToEdit(asset);
        setIsEditModalOpen(true);
    };

    const handleSaveEdit = (updatedAsset: Asset) => {
        updateAsset(updatedAsset, updatedAsset.updatedBy || "admin", "Update", "Asset details updated");

        // Critical Fix: Update the view modal state if it's currently showing this asset
        if (assetToView && assetToView.id === updatedAsset.id) {
            setAssetToView(updatedAsset);
        }

        setIsEditModalOpen(false);
        setAssetToEdit(null);
    };

    const handleDeleteClick = (asset: Asset) => {
        if (asset.status === "In Use" || asset.owner) {
            showAlert(
                "Cannot Delete Asset",
                <span>
                    Cannot delete asset <span className="font-bold text-slate-900">{asset.computerNo}</span> because it is currently assigned to <span className="font-bold text-slate-900">{asset.owner}</span>.
                    <br /><br />
                    Please return it to stock first.
                </span>,
                "error"
            );
            return;
        }
        setAssetsToDelete([asset]);
        setIsDeleteModalOpen(true);
    };



    // ... (inside the component)



    // ... existing imports ...

    // ... (inside component) ...

    if (loading) return <DashboardSkeleton />;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6 pb-20 md:pb-0 font-inter"
        >
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Asset Inventory</h1>
                    <p className="text-sm text-slate-500 mt-1">Manage and track all company assets.</p>
                </div>
            </div>

            {/* Dashboard Summary */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-5 lg:gap-6">
                {/* Total Assets - Large Card (Left) */}
                <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200 transition-all hover:shadow-xl lg:col-span-2">
                    {/* Decorative Background Accents - Subtle for Light Theme */}
                    <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-slate-50 blur-3xl group-hover:bg-slate-100 transition-colors"></div>
                    <div className="absolute -left-10 -bottom-10 h-32 w-32 rounded-full bg-blue-50/50 blur-2xl group-hover:bg-blue-100/50 transition-colors"></div>

                    <div className="relative z-10 flex h-full flex-col justify-between">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Assets</p>
                                <h3 className="mt-2 text-5xl sm:text-6xl font-black tracking-tight text-slate-900">{assets.filter(a => a.status !== "Disposed").length}</h3>
                            </div>
                            <div className="rounded-xl bg-slate-50 p-3 transition-colors group-hover:bg-slate-100">
                                <Box className="h-8 w-8 text-slate-700" />
                            </div>
                        </div>
                        <div className="mt-8 flex items-center gap-3">
                            <div className="flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-white shadow-md shadow-slate-200">
                                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                                ALL
                            </div>
                            <span className="text-sm font-medium text-slate-500">Registered Items</span>
                        </div>
                    </div>
                </div>

                {/* Status Grid (Right) */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:col-span-3 lg:grid-rows-2 lg:gap-4">
                    {/* In Stock */}
                    <div className="group relative flex flex-col justify-between rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition-all hover:shadow-md hover:ring-emerald-100">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">In Stock</p>
                                <h3 className="mt-1 text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{assets.filter(a => a.status === "In Stock").length}</h3>
                            </div>
                            <div className="rounded-xl bg-emerald-50 p-2.5 transition-colors group-hover:bg-emerald-100">
                                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-center gap-2">
                            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                                Available
                            </span>
                        </div>
                    </div>

                    {/* Second-hand */}
                    <div className="group relative flex flex-col justify-between rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition-all hover:shadow-md hover:ring-orange-100">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">History</p>
                                <h3 className="mt-1 text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                                    {assets.filter(a => logs.some(log => log.assetId === a.id && log.action === "Check-in")).length}
                                </h3>
                            </div>
                            <div className="rounded-xl bg-orange-50 p-2.5 transition-colors group-hover:bg-orange-100">
                                <History className="h-5 w-5 text-orange-600" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-center gap-2">
                            <span className="inline-flex items-center rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-orange-700 ring-1 ring-inset ring-orange-600/20">
                                Used
                            </span>
                        </div>
                    </div>

                    {/* In Use */}
                    <div className="group relative flex flex-col justify-between rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition-all hover:shadow-md hover:ring-blue-100">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">In Use</p>
                                <h3 className="mt-1 text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{assets.filter(a => a.status === "In Use").length}</h3>
                            </div>
                            <div className="rounded-xl bg-blue-50 p-2.5 transition-colors group-hover:bg-blue-100">
                                <User className="h-5 w-5 text-blue-600" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-center gap-2">
                            <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-700 ring-1 ring-inset ring-blue-600/20">
                                Assigned
                            </span>
                        </div>
                    </div>

                    {/* Disposed */}
                    <div className="group relative flex flex-col justify-between rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition-all hover:shadow-md hover:ring-slate-300">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Disposed</p>
                                <h3 className="mt-1 text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{assets.filter(a => a.status === "Disposed").length}</h3>
                            </div>
                            <div className="rounded-xl bg-slate-100 p-2.5 transition-colors group-hover:bg-slate-200">
                                <Trash2 className="h-5 w-5 text-slate-500" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-center gap-2">
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600 ring-1 ring-inset ring-slate-500/10">
                                Archive
                            </span>
                        </div>
                    </div>
                </div>
            </div>


            {/* Filters & Search */}
            <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm border border-slate-200 md:flex-row md:items-center md:gap-4 transition-all hover:shadow-md">
                <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search assets..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full md:w-auto md:flex md:gap-3">
                    <div className="relative col-span-1 min-w-0 md:w-48">
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                            <Filter className="h-3.5 w-3.5 text-slate-400" />
                        </div>
                        <select
                            value={departmentFilter}
                            onChange={(e) => setDepartmentFilter(e.target.value as Department | "All")}
                            className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-8 py-2.5 text-sm font-medium text-slate-700 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer"
                        >
                            <option value="All">All Depts</option>
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
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                            <ArrowUpDown className="h-3 w-3 text-slate-400 opacity-50" />
                        </div>
                    </div>
                    <div className="relative col-span-1 min-w-0 md:w-40">
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                            <Filter className="h-3.5 w-3.5 text-slate-400" />
                        </div>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as AssetStatus | "All")}
                            className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-8 py-2.5 text-sm font-medium text-slate-700 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer"
                        >
                            <option value="All">All Status</option>
                            <option value="In Stock">In Stock</option>
                            <option value="In Use">In Use</option>
                            <option value="Resign">Resign</option>
                            <option value="Missing">Missing</option>
                            <option value="Broken">Broken</option>
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                            <ArrowUpDown className="h-3 w-3 text-slate-400 opacity-50" />
                        </div>
                    </div>
                    <div className="relative col-span-1 min-w-0 md:w-40">
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                            <Filter className="h-3.5 w-3.5 text-slate-400" />
                        </div>
                        <select
                            value={lifecycleFilter}
                            onChange={(e) => setLifecycleFilter(e.target.value as "More than 5 Years" | "Less than 5 Years" | "All")}
                            className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-8 py-2.5 text-sm font-medium text-slate-700 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer"
                        >
                            <option value="All">All Ages</option>
                            <option value="More than 5 Years">&gt; 5 Years</option>
                            <option value="Less than 5 Years">&lt; 5 Years</option>
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                            <ArrowUpDown className="h-3 w-3 text-slate-400 opacity-50" />
                        </div>
                    </div>
                </div>
                {(searchTerm || departmentFilter !== "All" || statusFilter !== "All" || lifecycleFilter !== "All") && (
                    <button
                        onClick={() => {
                            setSearchTerm("");
                            setDepartmentFilter("All");
                            setStatusFilter("All");
                            setLifecycleFilter("All");
                        }}
                        className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-red-500 transition-colors shadow-sm whitespace-nowrap cursor-pointer md:w-auto"
                    >
                        <X className="h-4 w-4" />
                        <span className="hidden md:inline">Clear</span>
                    </button>
                )}
            </div>

            {/* Mobile Action Buttons */}
            <div className="grid grid-cols-3 gap-3 md:hidden">
                <button
                    onClick={() => setIsImportModalOpen(true)}
                    className="flex flex-col items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white p-3 text-slate-700 shadow-sm hover:bg-slate-50 active:bg-slate-100 cursor-pointer"
                >
                    <div className="rounded-full bg-slate-100 p-2">
                        <Download className="h-5 w-5 text-slate-600" />
                    </div>
                    <span className="text-xs font-medium">Import</span>
                </button>
                <button
                    onClick={handleExport}
                    className="flex flex-col items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white p-3 text-slate-700 shadow-sm hover:bg-slate-50 active:bg-slate-100 cursor-pointer"
                >
                    <div className="rounded-full bg-emerald-100 p-2">
                        <Upload className="h-5 w-5 text-emerald-600" />
                    </div>
                    <span className="text-xs font-medium">Export</span>
                </button>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex flex-col items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 p-3 text-white shadow-lg shadow-blue-500/20 active:scale-95 transition-all cursor-pointer"
                >
                    <div className="rounded-full bg-white/20 p-2">
                        <Plus className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-xs font-bold">Add Asset</span>
                </button>
            </div>

            <div className="flex flex-col gap-4">

                {/* Mobile Tabs */}
                <div className="flex md:hidden justify-center">
                    <div className="flex p-0.5 space-x-1 bg-slate-100 rounded-lg border border-slate-200 w-full">
                        <button
                            onClick={() => setActiveTab("active")}
                            className={`flex-1 px-3 py-1.5 text-xs font-medium leading-5 rounded-md focus:outline-none focus:ring-2 ring-blue-400 transition-all duration-200 ${activeTab === "active"
                                ? "bg-white text-slate-900 shadow-sm"
                                : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                                }`}
                        >
                            Active
                        </button>
                        <button
                            onClick={() => setActiveTab("disposed")}
                            className={`flex-1 px-3 py-1.5 text-xs font-medium leading-5 rounded-md focus:outline-none focus:ring-2 ring-blue-400 transition-all duration-200 ${activeTab === "disposed"
                                ? "bg-white text-slate-900 shadow-sm"
                                : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                                }`}
                        >
                            Disposed
                        </button>
                    </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-1">
                    <div className="flex items-center gap-3">
                        <div className="text-xs font-medium text-slate-700 md:text-sm">
                            Showing <span className="font-bold text-slate-900">{itemsPerPage === "All" ? 1 : (currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-bold text-slate-900">{itemsPerPage === "All" ? totalItems : Math.min(currentPage * itemsPerPage, totalItems)}</span> of <span className="font-bold text-slate-900">{totalItems}</span>
                        </div>
                        <div className="h-4 w-px bg-slate-300 mx-1 hidden md:block"></div>
                        <div className="flex items-center gap-2">
                            <span className="hidden text-sm font-medium text-slate-700 md:inline">Rows per page:</span>
                            <select
                                value={itemsPerPage}
                                onChange={handleItemsPerPageChange}
                                className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-black focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 md:text-sm cursor-pointer"
                            >
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                                <option value="All">All</option>
                            </select>
                        </div>
                        {selectedIds.size > 0 && (
                            <button
                                onClick={handleBulkDeleteClick}
                                className="flex items-center justify-center gap-1 rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700 shadow-sm transition-all animate-in fade-in zoom-in duration-200 ml-2 cursor-pointer"
                            >
                                <Trash2 className="h-3 w-3" />
                                Delete ({selectedIds.size})
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                        {/* Empty right side or other controls if needed */}
                    </div>
                    <div className="hidden md:flex items-center gap-2">
                        {/* View Tabs - Moved to Toolbar */}
                        <div className="flex p-0.5 space-x-1 bg-slate-100 rounded-lg border border-slate-200">
                            <button
                                onClick={() => setActiveTab("active")}
                                className={`px-3 py-1 text-xs font-medium leading-5 rounded-md focus:outline-none focus:ring-2 ring-blue-400 transition-all duration-200 ${activeTab === "active"
                                    ? "bg-white text-slate-900 shadow-sm"
                                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                                    }`}
                            >
                                Active
                            </button>
                            <button
                                onClick={() => setActiveTab("disposed")}
                                className={`px-3 py-1 text-xs font-medium leading-5 rounded-md focus:outline-none focus:ring-2 ring-blue-400 transition-all duration-200 ${activeTab === "disposed"
                                    ? "bg-white text-slate-900 shadow-sm"
                                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                                    }`}
                            >
                                Disposed
                            </button>
                        </div>
                        <div className="flex w-full items-center gap-2 sm:w-auto">
                            <button
                                onClick={() => setIsImportModalOpen(true)}
                                className="group flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-all shadow-sm sm:flex-none"
                            >
                                <Download className="h-4 w-4" />
                                <span>Import</span>
                            </button>
                            <button
                                onClick={handleExport}
                                className="group flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-all shadow-sm sm:flex-none"
                            >
                                <Upload className="h-4 w-4" />
                                <span>Export</span>
                            </button>
                            <button
                                onClick={() => setIsAddModalOpen(true)}
                                className="group flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98] sm:flex-none"
                            >
                                <Plus className="h-4 w-4 transition-transform group-hover:rotate-90" />
                                <span className="whitespace-nowrap">Add Asset</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Card View */}
                <div className="grid gap-4 md:hidden">
                    {paginatedAssets.length > 0 && (
                        <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 shadow-sm">
                            <input
                                type="checkbox"
                                className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                checked={isAllSelected}
                                onChange={handleSelectAll}
                            />
                            <span className="text-sm font-medium text-slate-700">Select All</span>
                        </div>
                    )}
                    {paginatedAssets.length === 0 ? (
                        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                            No assets found.
                        </div>
                    ) : (
                        paginatedAssets.map((asset) => (
                            <div
                                key={asset.id}
                                className={`rounded-lg border bg-white p-4 shadow-sm transition-colors ${selectedIds.has(asset.id) ? "border-blue-300 bg-blue-50" : "border-slate-200"}`}
                            >
                                <div className="mb-3 flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                            checked={selectedIds.has(asset.id)}
                                            onChange={() => handleSelectRow(asset.id)}
                                        />
                                        <div className="min-w-0 flex-1">
                                            <div className="font-bold text-slate-900 truncate">{asset.computerNo}</div>
                                            <div className="text-xs text-slate-500">S/N : {asset.serialNo}</div>
                                            <div className="text-xs text-slate-500">{asset.brand} {asset.model}</div>
                                        </div>
                                    </div>
                                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold leading-5 ${asset.status === "In Stock" ? "bg-green-100 text-green-800 border border-green-200" :
                                        asset.status === "In Use" ? "bg-blue-100 text-blue-800 border border-blue-200" :
                                            "bg-orange-100 text-orange-800 border border-orange-200"
                                        }`}>
                                        {asset.status}
                                    </span>
                                </div>

                                <div className="mb-4 grid grid-cols-2 gap-2 text-sm">
                                    <div>
                                        <span className="block text-xs text-slate-500">Owner</span>
                                        <span className="font-medium text-slate-700">{asset.owner || "-"}</span>
                                    </div>
                                    <div>
                                        <span className="block text-xs text-slate-500">Department</span>
                                        <span className="font-medium text-slate-700">{asset.department || "-"}</span>
                                    </div>
                                    <div>
                                        <span className="block text-xs text-slate-500">Age</span>
                                        {(() => {
                                            const { years, text } = calculateAssetAge(asset.purchaseDate);
                                            if (years >= 5) {
                                                return (
                                                    <span className="inline-flex rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold leading-5 text-red-800">
                                                        {text}
                                                    </span>
                                                );
                                            } else if (years >= 4) {
                                                return (
                                                    <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold leading-5 text-amber-800">
                                                        {text}
                                                    </span>
                                                );
                                            } else {
                                                return (
                                                    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold leading-5 text-slate-800">
                                                        {text}
                                                    </span>
                                                );
                                            }
                                        })()}
                                    </div>
                                </div>

                                {
                                    asset.remarks && (
                                        <div className="mb-3 rounded bg-slate-50 p-2 text-xs text-slate-600">
                                            <span className="font-semibold text-slate-700">Remarks:</span> {asset.remarks}
                                        </div>
                                    )
                                }

                                <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                                    <button
                                        onClick={() => {
                                            setAssetToView(asset);
                                            setIsViewModalOpen(true);
                                        }}
                                        className="flex flex-1 items-center justify-center gap-1 rounded bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 border border-slate-200 cursor-pointer"
                                    >
                                        <Eye className="h-3.5 w-3.5" />
                                        Details
                                    </button>
                                    {
                                        asset.status === "In Use" || asset.owner ? (
                                            <button
                                                onClick={() => handleAssignClick(asset)}
                                                className="flex flex-1 items-center justify-center gap-1 rounded bg-orange-50 px-3 py-1.5 text-xs font-medium text-orange-700 hover:bg-orange-100 cursor-pointer"
                                            >
                                                <UserCog className="h-3.5 w-3.5" />
                                                Return
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleAssignClick(asset)}
                                                className="flex flex-1 items-center justify-center gap-1 rounded bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 cursor-pointer"
                                            >
                                                <UserCog className="h-3.5 w-3.5" />
                                                Assign
                                            </button>
                                        )
                                    }

                                    <button
                                        onClick={() => handleDeleteClick(asset)}
                                        className="flex items-center justify-center rounded bg-red-50 px-3 py-1.5 text-red-700 hover:bg-red-100 cursor-pointer"
                                        title="Delete Asset"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )
                    }
                </div>

                {/* Desktop Table View */}
                <div className="hidden overflow-hidden rounded-lg border border-slate-200 bg-white shadow-md md:block">
                    <div className="max-h-[600px] overflow-y-auto">
                        <table className="min-w-full divide-y divide-slate-200 table-fixed">
                            <thead className="bg-slate-100 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="relative px-6 py-3 text-left" style={{ width: columnWidths.checkbox }}>
                                        <input
                                            type="checkbox"
                                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                            checked={isAllSelected}
                                            onChange={handleSelectAll}
                                        />
                                    </th>
                                    {[
                                        { id: "computerNo", label: "Computer No." },
                                        { id: "brand", label: "Brand" },
                                        { id: "owner", label: "Owner" },
                                        { id: "dept", label: "Dept" },
                                        { id: "status", label: "Status" },
                                        { id: "age", label: "Age" },
                                    ].map((col) => (
                                        <th
                                            key={col.id}
                                            className="relative px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-700 select-none group overflow-hidden text-ellipsis whitespace-nowrap cursor-pointer hover:bg-slate-200 transition-colors"
                                            style={{ width: columnWidths[col.id] }}
                                            onClick={() => handleSort(col.id as any)}
                                        >
                                            <div className="flex items-center gap-1">
                                                {col.label}
                                                {sortConfig.key === col.id ? (
                                                    sortConfig.direction === "asc" ? (
                                                        <ArrowUp className="h-3 w-3 text-blue-600" />
                                                    ) : (
                                                        <ArrowDown className="h-3 w-3 text-blue-600" />
                                                    )
                                                ) : (
                                                    <ArrowUpDown className="h-3 w-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                )}
                                            </div>
                                            <div
                                                className="absolute right-0 top-0 h-full w-4 cursor-col-resize hover:bg-blue-400/20 group-hover:bg-slate-300/50 z-20"
                                                onMouseDown={(e) => {
                                                    e.stopPropagation(); // Prevent sort when resizing
                                                    startResizing(e, col.id);
                                                }}
                                            >
                                                <div className="absolute right-0 top-0 h-full w-[1px] bg-slate-200 group-hover:bg-blue-400" />
                                            </div>
                                        </th>
                                    ))}
                                    <th className="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-700" style={{ width: columnWidths.actions }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 bg-white">
                                {paginatedAssets.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="px-6 py-8 text-center text-sm text-slate-500">
                                            No assets found matching your criteria.
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedAssets.map((asset) => (
                                        <tr key={asset.id} className={`hover:bg-blue-50 transition-colors ${selectedIds.has(asset.id) ? "bg-blue-50" : ""}`}>
                                            <td className="px-6 py-4">
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                    checked={selectedIds.has(asset.id)}
                                                    onChange={() => handleSelectRow(asset.id)}
                                                />
                                            </td>
                                            <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-900">
                                                <div className="font-semibold">{asset.computerNo}</div>
                                                <div className="text-xs text-slate-500">S/N : {asset.serialNo}</div>
                                            </td>
                                            <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-700">
                                                <div className="font-medium">{asset.brand || "-"}</div>
                                                <div className="text-xs text-slate-500">{asset.model || "-"}</div>
                                            </td>
                                            <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-700">
                                                <div className="font-medium">{asset.owner || "-"}</div>
                                                {asset.empId && <div className="text-xs text-slate-500">{asset.empId}</div>}
                                            </td>
                                            <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-700">{asset.department || "-"}</td>
                                            <td className="whitespace-nowrap px-6 py-4">
                                                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold leading-5 ${asset.status === "In Stock" ? "bg-green-100 text-green-800 border border-green-200" :
                                                    asset.status === "In Use" ? "bg-blue-100 text-blue-800 border border-blue-200" :
                                                        "bg-orange-100 text-orange-800 border border-orange-200"
                                                    }`}>
                                                    {asset.status}
                                                </span>
                                            </td>
                                            <td className="whitespace-nowrap px-6 py-4 text-sm">
                                                {(() => {
                                                    const { years, text } = calculateAssetAge(asset.purchaseDate);
                                                    if (years >= 5) {
                                                        return (
                                                            <span className="inline-flex rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold leading-5 text-red-800">
                                                                {text}
                                                            </span>
                                                        );
                                                    } else if (years >= 4) {
                                                        return (
                                                            <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold leading-5 text-amber-800">
                                                                {text}
                                                            </span>
                                                        );
                                                    } else {
                                                        return (
                                                            <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold leading-5 text-slate-800">
                                                                {text}
                                                            </span>
                                                        );
                                                    }
                                                })()}
                                            </td>
                                            <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setAssetToView(asset);
                                                            setIsViewModalOpen(true);
                                                        }}
                                                        className="rounded p-1 text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
                                                        title="View Asset Details"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </button>
                                                    {asset.status === "In Use" || asset.owner ? (
                                                        <button
                                                            onClick={() => handleAssignClick(asset)}
                                                            className="rounded p-1 text-orange-600 hover:bg-orange-100 hover:text-orange-800 transition-colors cursor-pointer"
                                                            title="Return Asset to Stock"
                                                        >
                                                            <UserCog className="h-4 w-4" />
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleAssignClick(asset)}
                                                            className="rounded p-1 text-blue-600 hover:bg-blue-100 hover:text-blue-800 transition-colors cursor-pointer"
                                                            title="Assign Asset"
                                                        >
                                                            <UserCog className="h-4 w-4" />
                                                        </button>
                                                    )}


                                                    <button
                                                        onClick={() => handleDeleteClick(asset)}
                                                        className="rounded p-1 text-red-600 hover:bg-red-100 hover:text-red-800 transition-colors cursor-pointer"
                                                        title="Delete Asset"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {
                    itemsPerPage !== "All" && totalPages > 1 && (
                        <div className="flex justify-center gap-2">
                            <button
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="rounded-md border border-slate-300 px-3 py-1 text-sm font-medium text-slate-700 disabled:opacity-50 hover:bg-slate-50 disabled:hover:bg-white transition-colors"
                            >
                                Previous
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                <button
                                    key={page}
                                    onClick={() => handlePageChange(page)}
                                    className={`rounded-md border px-3 py-1 text-sm font-medium transition-colors ${currentPage === page
                                        ? "bg-blue-600 text-white border-blue-600"
                                        : "border-slate-300 text-slate-700 hover:bg-slate-50"
                                        }`}
                                >
                                    {page}
                                </button>
                            ))}
                            <button
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="rounded-md border border-slate-300 px-3 py-1 text-sm font-medium text-slate-700 disabled:opacity-50 hover:bg-slate-50 disabled:hover:bg-white transition-colors"
                            >
                                Next
                            </button>
                        </div>
                    )
                }
            </div>

            {
                selectedAsset && (
                    <AssignmentModal
                        asset={selectedAsset}
                        isOpen={isModalOpen}
                        onClose={() => setIsModalOpen(false)}
                        onSave={handleSaveAssignment}
                    />
                )
            }

            {
                assetToView && (
                    <AssetDetailModal
                        asset={assetToView}
                        isOpen={isViewModalOpen}
                        onClose={() => setIsViewModalOpen(false)}
                        onEdit={() => handleEditClick(assetToView)}
                        onHistory={() => {
                            setAssetToHistory(assetToView);
                            setIsHistoryModalOpen(true);
                        }}
                    />
                )
            }

            {
                assetToEdit && (
                    <EditAssetModal
                        key={assetToEdit.id}
                        asset={assetToEdit}
                        isOpen={isEditModalOpen}
                        onClose={() => setIsEditModalOpen(false)}
                        onSave={handleSaveEdit}
                    />
                )
            }

            {
                assetToHistory && (
                    <AssetHistoryModal
                        asset={assetToHistory}
                        isOpen={isHistoryModalOpen}
                        onClose={() => setIsHistoryModalOpen(false)}
                    />
                )
            }

            <ImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
            />

            {/* Alert Modal */}
            <AlertModal
                isOpen={alertState.isOpen}
                onClose={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
                title={alertState.title}
                message={alertState.message}
                type={alertState.type}
                showCancel={alertState.showCancel}
                onConfirm={alertState.onConfirm}
                confirmText={alertState.confirmText}
                cancelText={alertState.cancelText}
            />

            {/* Delete Confirmation Modal */}
            {
                isDeleteModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                        <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl max-h-[90vh] flex flex-col">
                            <div className="mb-4 flex items-center justify-between">
                                <h2 className="text-xl font-bold text-slate-900">Confirm Deletion</h2>
                                <button onClick={() => setIsDeleteModalOpen(false)} className="text-slate-500 hover:text-slate-700 cursor-pointer">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                            <p className="mb-4 text-sm text-slate-600">
                                Are you sure you want to delete the following <span className="font-bold text-slate-900">{assetsToDelete.length}</span> asset(s)? This action cannot be undone.
                            </p>

                            <div className="mb-4 flex-1 overflow-y-auto rounded-md border border-slate-200 bg-slate-50 p-3">
                                <ul className="space-y-2">
                                    {assetsToDelete.map(asset => (
                                        <li key={asset.id} className="flex flex-col border-b border-slate-200 pb-2 last:border-0 last:pb-0">
                                            <span className="font-semibold text-slate-900">{asset.computerNo}</span>
                                            <span className="text-xs text-slate-500">Serial: {asset.serialNo}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="mb-6">
                                <label className="mb-2 block text-sm font-medium text-slate-700">
                                    Person In Charge
                                </label>
                                <div className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700">
                                    {user?.name || "Unknown"}
                                </div>
                            </div>


                            <div className="mb-6">
                                <label className="mb-2 block text-sm font-medium text-slate-700">
                                    Reason (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={deleteReason}
                                    onChange={(e) => setDeleteReason(e.target.value)}
                                    placeholder="Enter reason for deletion..."
                                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-black placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>

                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setIsDeleteModalOpen(false)}
                                    className="rounded-md border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    disabled={!user?.name}
                                    className="rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {
                isAddModalOpen && (
                    <AddAssetModal
                        isOpen={isAddModalOpen}
                        onClose={() => setIsAddModalOpen(false)}
                        onAdd={async (newAsset) => {
                            try {
                                await addAsset(newAsset, user?.name || "Unknown");
                                return true;
                            } catch (error) {
                                console.error("Failed to add asset from modal", error);
                                showAlert("Error", "Failed to add asset", "error");
                                return false;
                            }
                        }}
                    />
                )
            }
        </motion.div>
    );
}

export default function InventoryPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center p-8 text-slate-500">Loading inventory...</div>}>
            <InventoryContent />
        </Suspense>
    );
}
