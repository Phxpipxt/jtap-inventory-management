"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowRight, Lock } from "lucide-react";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
    const [pin, setPin] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const { login } = useAuth();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        // Simulate network delay for better UX
        await new Promise(resolve => setTimeout(resolve, 800));

        if (login(pin)) {
            router.push("/inventory");
        } else {
            setError("Invalid PIN Code");
            setLoading(false);
            setPin("");
        }
    };

    return (
        <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-slate-50">
            {/* Ambient Background Effects */}
            <div className="absolute -top-[20%] -left-[10%] h-[600px] w-[600px] rounded-full bg-blue-400/20 blur-[120px]" />
            <div className="absolute top-[40%] -right-[10%] h-[500px] w-[500px] rounded-full bg-indigo-400/20 blur-[100px]" />
            <div className="absolute -bottom-[10%] left-[20%] h-[400px] w-[400px] rounded-full bg-cyan-400/20 blur-[80px]" />

            {/* Glassmorphism Card */}
            <div className="relative z-10 w-full max-w-md p-6">
                <div className="overflow-hidden rounded-2xl border border-white/40 bg-white/60 shadow-xl backdrop-blur-xl ring-1 ring-black/5">

                    {/* Header Section */}
                    <div className="flex flex-col items-center pt-10 pb-8 px-8 text-center">
                        <div className="relative mb-6 h-20 w-64 transition-transform hover:scale-105 duration-500">
                            {/* 
                                Using the new uploaded logo.
                            */}
                            <div className="absolute inset-0 bg-white/50 blur-xl rounded-full opacity-50"></div>
                            <Image
                                src="/jtekt_logo_login.png"
                                alt="JTEKT Logo"
                                fill
                                className="object-contain drop-shadow-md"
                                priority
                            />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-800 mb-2">
                            JTAP IT Asset Control
                        </h1>
                        <p className="text-sm text-slate-500">
                            Secure Access Portal
                        </p>
                    </div>

                    {/* Form Section */}
                    <div className="bg-white/40 px-8 pb-10 pt-6">
                        <form onSubmit={handleLogin} className="space-y-6">
                            {error && (
                                <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-100 p-3 text-sm text-red-600 animate-in slide-in-from-top-2 fade-in duration-300">
                                    <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
                                    {error}
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 ml-1">
                                    PIN Code
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                                        <Lock className="h-5 w-5" />
                                    </div>
                                    <input
                                        type="password"
                                        value={pin}
                                        onChange={(e) => setPin(e.target.value)}
                                        disabled={loading}
                                        className="block w-full rounded-xl border-0 bg-white/70 py-3.5 pl-10 pr-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm sm:leading-6 transition-all hover:bg-white"
                                        placeholder="Enter your 6-digit PIN"
                                        maxLength={6}
                                        autoFocus
                                        style={{ letterSpacing: '0.25em', textAlign: 'center', paddingLeft: '2.5rem' }}
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading || pin.length < 4}
                                className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg transition-all hover:bg-blue-500 hover:shadow-blue-500/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            >
                                <span className="relative flex items-center justify-center gap-2">
                                    {loading ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Verifying...
                                        </>
                                    ) : (
                                        <>
                                            Sign in
                                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                                        </>
                                    )}
                                </span>
                            </button>
                        </form>
                    </div>

                    {/* Footer */}
                    <div className="px-8 py-4 text-center border-t border-slate-100 bg-slate-50/50">
                        <p className="text-xs text-slate-400">
                            &copy; {new Date().getFullYear()} JTEKT ASIA PACIFIC CO., LTD. All rights reserved.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
