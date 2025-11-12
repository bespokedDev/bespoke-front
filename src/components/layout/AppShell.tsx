"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { AuthProvider } from "@/contexts/AuthContext";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { SidebarNav } from "@/components/ui/sidebar-nav";
import { Topbar } from "@/components/ui/topbar";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const isPublicRoute = pathname === "/login";

  useEffect(() => {
    document.title = "Academia Bespoke | Admin";
  }, []);

  if (isPublicRoute) {
    return <AuthProvider>{children}</AuthProvider>;
  }

  return (
    <AuthProvider>
      <AuthGuard>
        <div className="flex min-h-screen">
          <SidebarNav />
          <div className="flex flex-1 flex-col">
            <Topbar />
            <main className="flex-1 space-y-6 p-6">{children}</main>
          </div>
        </div>
      </AuthGuard>
    </AuthProvider>
  );
}

