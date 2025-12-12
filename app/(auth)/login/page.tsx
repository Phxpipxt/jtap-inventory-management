"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
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
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
            <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
                <div className="mb-6 flex flex-col items-center text-center">
                    <div className="relative mb-4 h-16 w-48">
                        <Image
                            src="/logo.png"
                            alt="Company Logo"
                            fill
                            className="object-contain"
                            priority
                        />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800">Asset Control System</h1>
                    <p className="text-slate-500">Please sign in to continue</p>
                </div>
                <form onSubmit={handleLogin} className="space-y-4">
                    {error && (
                        <div className="rounded bg-red-50 p-3 text-sm text-red-600">
                            {error}
                        </div>
                    )}
                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                            PIN Code
                        </label>
                        <input
                            type="password"
                            value={pin}
                            onChange={(e) => setPin(e.target.value)}
                            disabled={loading}
                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed tracking-widest text-center text-lg"
                            placeholder="••••••"
                            maxLength={6}
                            autoFocus
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex w-full items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Signing in...
                            </>
                        ) : (
                            "Sign In"
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
