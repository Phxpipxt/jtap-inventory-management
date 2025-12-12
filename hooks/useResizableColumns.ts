import { useState, useEffect, useCallback } from "react";

export function useResizableColumns(initialWidths: Record<string, string | number>) {
    const [columnWidths, setColumnWidths] = useState(initialWidths);
    const [resizingCol, setResizingCol] = useState<string | null>(null);
    const [startX, setStartX] = useState(0);
    const [startWidth, setStartWidth] = useState(0);

    const startResizing = useCallback((e: React.MouseEvent, colId: string) => {
        e.preventDefault();
        setResizingCol(colId);
        setStartX(e.clientX);

        // Get current width
        const currentWidth = columnWidths[colId];
        // Convert percentage string to approximate pixels if needed, or just use the current computed width from the DOM if possible.
        // For simplicity and consistency with the previous implementation, we'll rely on the state.
        // If the state is a string like "15%", we might need to handle it. 
        // However, the previous implementation likely initialized with pixel values or handled it.
        // Let's assume initialWidths are mostly pixel values or we parse them.

        // Actually, looking at the previous implementation, it seems it was updating state directly.
        // Let's grab the actual current width from the element to be safe, or fall back to state.
        // But since we don't have a ref to the specific th here easily without more complex setup,
        // let's stick to the state-based approach which worked in InventoryPage.

        const widthVal = typeof currentWidth === 'number' ? currentWidth : parseInt(currentWidth as string, 10);
        setStartWidth(widthVal || 100); // Default to 100 if parsing fails
    }, [columnWidths]);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!resizingCol) return;

            const diff = e.clientX - startX;
            const newWidth = Math.max(50, startWidth + diff); // Minimum width 50px

            setColumnWidths((prev) => ({
                ...prev,
                [resizingCol]: `${newWidth}px`,
            }));
        };

        const handleMouseUp = () => {
            setResizingCol(null);
        };

        if (resizingCol) {
            window.addEventListener("mousemove", handleMouseMove);
            window.addEventListener("mouseup", handleMouseUp);
        }

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [resizingCol, startX, startWidth]);

    return { columnWidths, startResizing };
}
