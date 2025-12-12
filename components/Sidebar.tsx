"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Package, ClipboardCheck, LogOut, History, X, Menu, FileText, Repeat, ChevronDown, ChevronRight, Monitor, Tag, ClipboardList } from "lucide-react";
import { cn, getAvatarColor } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

const navigation = [
    {
        name: "Inventory",
        icon: Package,
        children: [
            { name: "All Assets", href: "/inventory", icon: Monitor },
            { name: "Second-hand", href: "/second-hand", icon: Repeat },
            { name: "Dispose", href: "/dispose", icon: Tag },
        ]
    },
    {
        name: "Audit",
        icon: ClipboardCheck,
        children: [
            { name: "Audit Check", href: "/audit", icon: ClipboardList },
            { name: "Audit History", href: "/audit-history", icon: History },
        ]
    },
    { name: "Activity Logs", href: "/logs", icon: FileText },
];

export function Sidebar({ isOpen, onClose }: { isOpen?: boolean; onClose?: () => void }) {
    const pathname = usePathname();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const { user, logout } = useAuth();
    const [expandedMenus, setExpandedMenus] = useState<string[]>(["Inventory"]); // Default open Inventory

    // Handle responsive state
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    const toggleMenu = (name: string) => {
        setExpandedMenus(prev =>
            prev.includes(name) ? prev.filter(item => item !== name) : [...prev, name]
        );
    };

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 md:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar */}
            <div className={cn(
                "fixed inset-y-0 left-0 z-50 flex h-full flex-col bg-slate-900 text-white transition-transform duration-300 ease-in-out md:static md:translate-x-0",
                isOpen ? "translate-x-0" : "-translate-x-full",
                isCollapsed && !isMobile ? "w-20" : "w-64"
            )}>
                {/* Header with Logo and Toggle */}
                <div className={cn(
                    "flex h-20 items-center border-b border-slate-800 bg-white transition-all",
                    isCollapsed && !isMobile ? "justify-center px-2" : "justify-between px-4"
                )}>
                    {(!isCollapsed || isMobile) && (
                        <div className="flex flex-col items-center justify-center animate-in fade-in duration-300">
                            <div className="relative h-10 w-32 mb-1">
                                <Image
                                    src="/jtekt_logo_header_v2.png"
                                    alt="JTEKT Logo"
                                    fill
                                    priority
                                    sizes="128px"
                                    className="object-contain"
                                />
                            </div>
                            <span className="text-[10px] font-bold text-slate-700 tracking-wider whitespace-nowrap overflow-hidden transition-all">
                                ASIA PACIFIC CO., LTD.
                            </span>
                        </div>
                    )}

                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="hidden rounded-md p-2 text-slate-600 hover:bg-slate-100 md:block cursor-pointer"
                        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                    >
                        <Menu className="h-6 w-6" />
                    </button>

                    {/* Mobile Close Button */}
                    <button
                        onClick={onClose}
                        className="rounded-md p-2 text-slate-600 hover:bg-slate-100 md:hidden cursor-pointer"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Navigation Links */}
                <div className="flex-1 overflow-y-auto py-4">
                    <nav className="space-y-1 px-2">
                        {navigation.map((item) => {
                            // Check if any child is active
                            const isChildActive = item.children?.some(child => pathname === child.href);
                            const isActive = !item.children && (pathname === item.href || (item.href && pathname.startsWith(`${item.href}/`)));
                            const isExpanded = expandedMenus.includes(item.name);

                            if (item.children) {
                                return (
                                    <div key={item.name} className="space-y-1">
                                        <button
                                            onClick={() => {
                                                if (isCollapsed && !isMobile) {
                                                    setIsCollapsed(false); // Auto expand sidebar if clicking a group
                                                    setTimeout(() => toggleMenu(item.name), 100);
                                                } else {
                                                    toggleMenu(item.name);
                                                }
                                            }}
                                            className={cn(
                                                "group flex w-full items-center justify-between rounded-md px-2 py-2 text-sm font-medium transition-colors text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer",
                                                isChildActive && "text-white",
                                                isCollapsed && !isMobile && "justify-center"
                                            )}
                                            title={isCollapsed && !isMobile ? item.name : undefined}
                                        >
                                            <div className="flex items-center">
                                                <item.icon
                                                    className={cn(
                                                        "h-6 w-6 flex-shrink-0 transition-all",
                                                        isChildActive ? "text-white" : "text-slate-400 group-hover:text-white",
                                                        !isCollapsed && !isMobile && "mr-3",
                                                        isMobile && "mr-3"
                                                    )}
                                                    aria-hidden="true"
                                                />
                                                {(!isCollapsed || isMobile) && (
                                                    <span className="truncate">{item.name}</span>
                                                )}
                                            </div>
                                            {(!isCollapsed || isMobile) && (
                                                <div className="ml-2">
                                                    {isExpanded ? (
                                                        <ChevronDown className="h-4 w-4 text-slate-400" />
                                                    ) : (
                                                        <ChevronRight className="h-4 w-4 text-slate-400" />
                                                    )}
                                                </div>
                                            )}
                                        </button>

                                        {/* Submenu */}
                                        {isExpanded && (!isCollapsed || isMobile) && (
                                            <div className="space-y-1 pl-11">
                                                {item.children.map((child) => {
                                                    const isSubActive = pathname === child.href;
                                                    return (
                                                        <Link
                                                            key={child.name}
                                                            href={child.href}
                                                            onClick={() => onClose?.()}
                                                            className={cn(
                                                                "group flex items-center rounded-md px-2 py-2 text-sm font-medium transition-colors",
                                                                isSubActive
                                                                    ? "bg-slate-800 text-white"
                                                                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                                                            )}
                                                        >
                                                            {/* @ts-ignore */}
                                                            {child.icon && (
                                                                // @ts-ignore
                                                                <child.icon
                                                                    className={cn(
                                                                        "mr-3 h-5 w-5 flex-shrink-0 transition-all",
                                                                        isSubActive ? "text-white" : "text-slate-400 group-hover:text-white"
                                                                    )}
                                                                    aria-hidden="true"
                                                                />
                                                            )}
                                                            <span className="truncate">{child.name}</span>
                                                        </Link>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            }

                            return (
                                <Link
                                    key={item.name}
                                    href={item.href || "#"}
                                    onClick={() => onClose?.()}
                                    className={cn(
                                        "group flex items-center rounded-md px-2 py-2 text-sm font-medium transition-colors",
                                        isActive
                                            ? "bg-slate-800 text-white"
                                            : "text-slate-300 hover:bg-slate-800 hover:text-white",
                                        isCollapsed && !isMobile && "justify-center"
                                    )}
                                    title={isCollapsed && !isMobile ? item.name : undefined}
                                >
                                    <item.icon
                                        className={cn(
                                            "h-6 w-6 flex-shrink-0 transition-all",
                                            isActive ? "text-white" : "text-slate-400 group-hover:text-white",
                                            !isCollapsed && !isMobile && "mr-3",
                                            isMobile && "mr-3"
                                        )}
                                        aria-hidden="true"
                                    />
                                    {(!isCollapsed || isMobile) && (
                                        <span className="truncate animate-in fade-in slide-in-from-left-2 duration-200">{item.name}</span>
                                    )}
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                {/* Footer Section */}
                <div className="border-t border-slate-800 bg-slate-900 p-4">
                    {user && (
                        <div className={cn(
                            "mb-4 flex items-center gap-2 rounded-md bg-slate-800/50 p-2 transition-all",
                            isCollapsed && !isMobile ? "flex-col justify-center bg-transparent p-0 gap-4" : "justify-between"
                        )}>
                            <div className={cn(
                                "flex items-center gap-3 overflow-hidden",
                                isCollapsed && !isMobile && "justify-center w-full"
                            )}>
                                <div className={cn(
                                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white",
                                    getAvatarColor(user.name)
                                )}>
                                    {user.name.charAt(0)}
                                </div>
                                {(!isCollapsed || isMobile) && (
                                    <div className="overflow-hidden">
                                        <p className="truncate text-sm font-medium text-white">{user.name}</p>
                                        <p className="truncate text-xs text-slate-400">Admin</p>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={() => logout()}
                                className={cn(
                                    "group flex items-center justify-center rounded-md text-slate-400 hover:text-white transition-colors cursor-pointer",
                                    isCollapsed && !isMobile ? "p-2 hover:bg-slate-800" : "p-1"
                                )}
                                title="Logout"
                            >
                                <LogOut className="h-5 w-5" />
                            </button>
                        </div>
                    )}

                    {!user && (
                        <button
                            onClick={() => logout()}
                            className={cn(
                                "group mb-4 flex w-full items-center rounded-md px-2 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer",
                                isCollapsed && !isMobile && "justify-center"
                            )}
                            title={isCollapsed && !isMobile ? "Logout" : undefined}
                        >
                            <LogOut
                                className={cn(
                                    "h-6 w-6 flex-shrink-0 text-slate-400 group-hover:text-white",
                                    (!isCollapsed || isMobile) && "mr-3"
                                )}
                                aria-hidden="true"
                            />
                            {(!isCollapsed || isMobile) && (
                                <span className="truncate animate-in fade-in slide-in-from-left-2 duration-200">Logout</span>
                            )}
                        </button>
                    )}

                    {(!isCollapsed || isMobile) && (
                        <div className="space-y-2 text-xs text-slate-500">
                            <div className="text-center">
                                <p>&copy; {new Date().getFullYear()} JTAP Inventory</p>
                                <div className="flex justify-center gap-2">
                                    <Link href="/terms" className="hover:text-slate-300">Terms</Link>
                                    <span>&bull;</span>
                                    <Link href="/privacy" className="hover:text-slate-300">Privacy</Link>
                                </div>
                                <p className="mt-1">Develop by <span className="text-slate-400">Phupipat Jimjuan</span></p>
                                <p className="mt-1">Management Information System</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
