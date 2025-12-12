import type { Metadata, Viewport } from "next";
import "./globals.css";
import { InventoryProvider } from "@/context/InventoryContext";
import { AuthProvider } from "@/context/AuthContext";
import { SessionTimeout } from "@/components/SessionTimeout";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "JTAP | Inventory Asset Managment",
  description: "Inventory management for JTAP",
  icons: {
    icon: "/jtekt_logo_header.png",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://scalar-andromeda.vercel.app/",
    title: "JTAP | Inventory Asset Managment",
    description: "Inventory management for JTAP",
    siteName: "JTAP Inventory",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthProvider>
          <InventoryProvider>
            <SessionTimeout />
            {children}
          </InventoryProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
