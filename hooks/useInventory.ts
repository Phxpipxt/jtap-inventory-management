"use client";

import { useInventoryContext } from "@/context/InventoryContext";

export function useInventory() {
    return useInventoryContext();
}
