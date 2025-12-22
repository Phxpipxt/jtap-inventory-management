import type { Metadata, Viewport } from "next";
import "./globals.css";
import { InventoryProvider } from "@/context/InventoryContext";
import { AuthProvider } from "@/context/AuthContext";
import { SessionTimeout } from "@/components/SessionTimeout";
import { QueryProvider } from "@/components/providers/QueryProvider";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "JTAP IT Asset Control",
  description: "IT Asset Control System for JTAP",
  icons: {
    icon: "/jtekt_logo_header.png",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://scalar-andromeda.vercel.app/",
    title: "JTAP IT Asset Control",
    description: "IT Asset Control System for JTAP",
    siteName: "JTAP IT Asset Control",
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
          <QueryProvider>
            <InventoryProvider>
              <SessionTimeout />
              {children}
            </InventoryProvider>
          </QueryProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
