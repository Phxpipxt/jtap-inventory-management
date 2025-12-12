"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";

const TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

export function SessionTimeout() {
    const router = useRouter();
    const pathname = usePathname();
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const lastActivityRef = useRef<number>(Date.now());

    useEffect(() => {
        // Only active on protected routes
        if (pathname === "/login" || pathname === "/") return;

        const logout = () => {
            // Clear auth cookie
            document.cookie = "auth=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
            router.push("/login");
        };

        const resetTimer = () => {
            const now = Date.now();
            // Throttle resets to once per second to avoid performance issues
            if (now - lastActivityRef.current < 1000) return;

            lastActivityRef.current = now;

            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
            timerRef.current = setTimeout(logout, TIMEOUT_MS);
        };

        // Initial timer
        timerRef.current = setTimeout(logout, TIMEOUT_MS);

        // Event listeners for user activity
        const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart"];

        events.forEach(event => {
            window.addEventListener(event, resetTimer);
        });

        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
            events.forEach(event => {
                window.removeEventListener(event, resetTimer);
            });
        };
    }, [pathname, router]);

    return null;
}
