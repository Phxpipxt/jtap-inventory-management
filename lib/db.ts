
const DB_NAME = "InventoryDB";
const STORE_NAME = "images";
const DB_VERSION = 1;

export const initDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
    });
};

// Stores string[] (array of base64 images)
export const saveImagesToDB = async (id: string, images: string[]): Promise<void> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(images, id);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
};

export const getImagesFromDB = async (id: string): Promise<string[] | null> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(id);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const result = request.result;
            if (Array.isArray(result)) {
                resolve(result);
            } else if (typeof result === "string") {
                // Backward compatibility: If stored as string, wrap in array
                resolve([result]);
            } else {
                resolve(null);
            }
        };
    });
};

// Deprecated: kept to avoid breaking changes if called elsewhere, but we should migrate to saveImagesToDB
export const saveImageToDB = async (id: string, imageData: string): Promise<void> => {
    return saveImagesToDB(id, [imageData]);
};

// Deprecated: kept for backward compatibility
export const getImageFromDB = async (id: string): Promise<string | null> => {
    const images = await getImagesFromDB(id);
    return images && images.length > 0 ? images[0] : null;
};

export const deleteImageFromDB = async (id: string): Promise<void> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
};
