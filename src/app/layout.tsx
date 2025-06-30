"use client";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SidebarNav } from "@/components/ui/sidebar-nav";
import { Topbar } from "@/components/ui/topbar";
import { AuthProvider } from "@/contexts/AuthContext";
import { AuthGuard } from "@/components/auth/AuthGuard";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isPublicRoute = pathname === "/login";

  useEffect(() => {
    document.title = "Academia Bespoke | Admin";
  }, []);

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-lightBackground dark:bg-darkBackground text-lightText dark:text-darkText`}
      >
        <AuthProvider>
          {isPublicRoute ? (
            // Para la ruta de login, solo renderizamos el contenido de la página
            children
          ) : (
            // Para todas las demás rutas, aplicamos el guardia de autenticación
            // y la interfaz principal
            <AuthGuard>
              <div className="flex min-h-screen">
                <SidebarNav />
                <div className="flex-1 flex flex-col">
                  <Topbar />
                  <main className="flex-1 p-6 space-y-6">{children}</main>
                </div>
              </div>
            </AuthGuard>
          )}
        </AuthProvider>
      </body>
    </html>
  );
}
