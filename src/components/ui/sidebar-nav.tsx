"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  UserCircle,
  Menu,
  ChevronLeft,
  FileBadge,
  CircleDollarSign,
} from "lucide-react";

const items = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard },
  { title: "Teachers", href: "/teachers", icon: UserCircle },
  { title: "Students", href: "/students", icon: Users },
  //{ title: "Plans", href: "/plans", icon: CreditCard },
  { title: "Enrollments", href: "/enrollments", icon: FileBadge },
  { title: "Payouts", href: "/payouts", icon: CircleDollarSign },
  //{ title: "Configuración", href: "/configuracion", icon: Settings },
];

export function SidebarNav() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "min-h-screen border-r border-light-border dark:border-dark-border bg-light-sidebar dark:bg-dark-sidebar transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-2">
          <Image src="/logo.png" alt="Logo" width={32} height={32} />
          {!collapsed && <span className="font-bold text-lg">Bespoke</span>}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-muted-foreground hover:text-foreground"
        >
          {collapsed ? <Menu className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </button>
      </div>
      <nav className="flex flex-col gap-1 p-2">
        {items.map(({ title, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-4 py-2 text-sm rounded-md hover:bg-lightBorder transition-colors",
              "justify-start",
              pathname === href
                ? "bg-secondary text-white hover:bg-secondary/90"
                : "text-lightText hover:bg-primary hover:text-white dark:text-darkText dark:hover:text-white"
            )}
          >
            <Icon className="mr-2 h-5 w-5 shrink-0" />
            {!collapsed && <span className="truncate">{title}</span>}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
