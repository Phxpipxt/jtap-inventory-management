"use client";
import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Menu } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const { user } = useAuth();

    return (
        <div className="flex min-h-screen bg-slate-50 md:h-screen md:overflow-hidden">
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            <div className="flex flex-1 flex-col md:overflow-hidden">
                {/* Mobile Header */}
                <div className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white p-4 shadow-sm md:hidden">
                    <div className="flex items-center">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="rounded-md p-2 text-slate-600 hover:bg-slate-100 cursor-pointer"
                        >
                            <Menu className="h-6 w-6" />
                        </button>
                        <span className="ml-4 text-lg font-semibold text-slate-900">JTAP Inventory</span>
                    </div>

                </div>

                <main className="flex-1 p-4 md:overflow-y-auto md:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
