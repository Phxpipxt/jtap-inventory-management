export type Department =
    | "Board of Directors"
    | "BP"
    | "CU"
    | "CP"
    | "FA"
    | "HR"
    | "IT"
    | "OD"
    | "PL"
    | "PE"
    | "PU"
    | "QA"
    | "SA"
    | "TC";

export const DEPARTMENTS: Department[] = [
    "Board of Directors",
    "BP",
    "CU",
    "CP",
    "FA",
    "HR",
    "IT",
    "OD",
    "PL",
    "PE",
    "PU",
    "QA",
    "SA",
    "TC",
];

export type AssetStatus = "In Stock" | "In Use" | "Resign" | "Assigned" | "Broken" | "Maintenance" | "Disposed";

export type Brand = "Dell" | "Lenovo" | "HP" | "Asus";
export const BRANDS: Brand[] = ["Dell", "Lenovo", "HP", "Asus"];


export const HDD_OPTIONS = ["128 GB", "256 GB", "512 GB", "1 TB"];
export const RAM_OPTIONS = [
    // DDR4
    "8 GB (DDR4)", "16 GB (DDR4)", "32 GB (DDR4)", "64 GB (DDR4)", "128 GB (DDR4)",
    // DDR5
    "8 GB (DDR5)", "16 GB (DDR5)", "32 GB (DDR5)", "64 GB (DDR5)", "128 GB (DDR5)"
];

export interface Asset {
    id: string; // Unique ID (e.g., UUID)
    computerNo: string; // JTAPNB-XXXXXX
    serialNo: string;
    brand?: Brand | string; // Allow string for backward compatibility or other brands if needed, but UI will enforce Brand type
    model?: string;
    owner?: string | null;
    empId?: string | null;
    department?: Department | null;
    status: AssetStatus;
    purchaseDate?: string; // ISO Date
    warrantyExpiry?: string; // ISO Date
    tags?: string[]; // e.g., "High Performance", "Developer"
    remarks?: string; // Additional notes or comments
    hdd?: string; // Optional HDD/SSD
    ram?: string; // Optional RAM
    cpu?: string; // Optional CPU
    image?: string; // Deprecated: Use images instead
    images?: string[]; // Base64 strings for asset images (Max 3)
    distributionDate?: string; // ISO Date of when asset was assigned
    lastUpdated: string; // ISO Date
    updatedBy: string; // Admin username
}

export interface LogEntry {
    id: string;
    assetId: string | null;
    computerNo: string;
    serialNo: string;
    action: "Check-in" | "Check-out" | "Add" | "Update" | "Audit" | "Delete" | "Dispose" | "Import";
    timestamp: string;
    adminUser: string;
    details?: string;
}

export interface AuditLog {
    id: string;
    date: string;
    totalAssets: number;
    scannedCount: number;
    missingCount: number;
    scannedIds: string[];
    missingIds?: string[]; // IDs of missing assets
    status: "Completed" | "In Progress";
    auditedBy?: string;
    verifiedBy?: string; // Deprecated, kept for backward compatibility
    verifiedAt?: string; // Deprecated
    supervisor1VerifiedBy?: string;
    supervisor1VerifiedAt?: string;
    verificationStatus?: "Pending" | "Supervisor 1 Verified" | "Verified"; // "Verified" means Fully Verified
}

export type PersonInCharge =
    | "Masaki Shibata"
    | "Phakkhawat Khamkon"
    | "Suradet Sarnyos"
    | "Panupong Kongpun"
    | "Suchada Chonlak"
    | "Pentip Kakulnit"
    | "Phupipat Jimjuan";

export const PERSONS_IN_CHARGE: PersonInCharge[] = [
    "Masaki Shibata",
    "Phakkhawat Khamkon",
    "Suradet Sarnyos",
    "Panupong Kongpun",
    "Suchada Chonlak",
    "Pentip Kakulnit",
    "Phupipat Jimjuan",
];

export type Supervisor =
    | "Masaki Shibata"
    | "Phakkhawat Khamkon"
    | "Suradet Sarnyos";

export const SUPERVISORS: Supervisor[] = [
    "Masaki Shibata",
    "Phakkhawat Khamkon",
    "Suradet Sarnyos",
];

export const PIN_MAPPING: Record<string, string> = {
    "541107": "Suradet Sarnyos",
    "100719": "Panupong Kongpun",
    "162018": "Suchada Chonlak",
    "330826": "Pentip Kakulnit",
    "050800": "Phupipat Jimjuan",
    "111111": "Phakkhawat Khamkon",
    "121212": "Masaki Shibata",
};

export interface User {
    name: string;
    pin: string;
    isAuthenticated: boolean;
}
