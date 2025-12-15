import { Skeleton } from "@/components/ui/Skeleton";

export function DashboardSkeleton() {
    return (
        <div className="space-y-6 pb-20 md:pb-0 animate-in fade-in duration-500">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <Skeleton className="h-8 w-48" />
            </div>

            {/* Dashboard Summary Skeleton */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-5 lg:gap-6">
                {/* Total Assets Card */}
                <Skeleton className="h-[240px] rounded-3xl lg:col-span-2" />

                {/* Status Grid */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:col-span-3 lg:grid-rows-2 lg:gap-4">
                    <Skeleton className="h-[140px] rounded-3xl" />
                    <Skeleton className="h-[140px] rounded-3xl" />
                    <Skeleton className="h-[140px] rounded-3xl" />
                    <Skeleton className="h-[140px] rounded-3xl" />
                </div>
            </div>

            {/* Filters Skeleton */}
            <div className="flex flex-col gap-3 rounded-lg bg-white p-4 shadow-md border border-slate-100 md:flex-row md:gap-4">
                <Skeleton className="h-10 w-full md:flex-1" />
                <div className="grid grid-cols-2 gap-2 w-full md:flex md:w-auto md:gap-4">
                    <Skeleton className="h-10 w-full md:w-64" />
                    <Skeleton className="h-10 w-full md:w-64" />
                    <Skeleton className="h-10 w-full md:w-64" />
                </div>
            </div>

            {/* Table Skeleton */}
            <div className="hidden border border-slate-200 bg-white shadow-md md:block rounded-lg overflow-hidden">
                <div className="border-b border-slate-200 bg-slate-50 px-6 py-3">
                    <div className="flex gap-4">
                        <Skeleton className="h-4 w-4" />
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <Skeleton key={i} className="h-4 w-24" />
                        ))}
                    </div>
                </div>
                <div className="p-0">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex items-center gap-4 border-b border-slate-100 px-6 py-4 last:border-0">
                            <Skeleton className="h-4 w-4" />
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-4 w-16" />
                            <Skeleton className="h-6 w-20 rounded-full" />
                            <Skeleton className="h-4 w-12" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Mobile Card Skeleton */}
            <div className="grid gap-4 md:hidden">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex gap-3 w-full">
                                <Skeleton className="h-5 w-5" />
                                <div className="space-y-2 flex-1">
                                    <Skeleton className="h-5 w-32" />
                                    <Skeleton className="h-3 w-24" />
                                </div>
                            </div>
                            <Skeleton className="h-6 w-20 rounded-full" />
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="space-y-1">
                                <Skeleton className="h-3 w-10" />
                                <Skeleton className="h-4 w-20" />
                            </div>
                            <div className="space-y-1">
                                <Skeleton className="h-3 w-10" />
                                <Skeleton className="h-4 w-20" />
                            </div>
                        </div>
                        <div className="flex gap-2 pt-3 border-t border-slate-100">
                            <Skeleton className="h-8 flex-1" />
                            <Skeleton className="h-8 flex-1" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function TableSkeleton() {
    return (
        <div className="space-y-6 pb-20 md:pb-0 animate-in fade-in duration-500">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <Skeleton className="h-8 w-48" />
            </div>

            {/* Filters Skeleton */}
            <div className="flex flex-col gap-3 rounded-lg bg-white p-4 shadow-md border border-slate-100 md:flex-row md:gap-4">
                <Skeleton className="h-10 w-full md:flex-1" />
                <Skeleton className="h-10 w-32" />
            </div>

            {/* Table Skeleton */}
            <div className="hidden border border-slate-200 bg-white shadow-md md:block rounded-lg overflow-hidden">
                <div className="border-b border-slate-200 bg-slate-50 px-6 py-3">
                    <div className="flex justify-between">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <Skeleton key={i} className="h-4 w-32" />
                        ))}
                    </div>
                </div>
                <div className="p-0">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                        <div key={i} className="flex justify-between items-center border-b border-slate-100 px-6 py-4 last:border-0">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-4 w-32" />
                        </div>
                    ))}
                </div>
            </div>
            {/* Mobile Card Skeleton */}
            <div className="grid gap-4 md:hidden">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-3">
                        <div className="flex justify-between">
                            <Skeleton className="h-5 w-32" />
                            <Skeleton className="h-5 w-20" />
                        </div>
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-2/3" />
                    </div>
                ))}
            </div>
        </div>
    )
}
