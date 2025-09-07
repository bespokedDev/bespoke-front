// En: components/ui/sidebar-nav.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  UserCircle,
  Menu,
  ChevronLeft,
  ChevronDown,
  FileBadge,
  CircleDollarSign,
  Landmark, // Icono para Contabilidad
  ArrowRightLeft,
  FileChartColumn, // Icono para Ingresos
  BookOpen, // Icono para Plans
  CreditCard, // Icono para Payment Methods
} from "lucide-react";

// --- NUEVA ESTRUCTURA DE NAVEGACIÓN ---
const navItems = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard },
  { title: "Teachers", href: "/teachers", icon: UserCircle },
  { title: "Students", href: "/students", icon: Users },
  { title: "Plans", href: "/plans", icon: BookOpen },
  { title: "Payment Methods", href: "/payment-methods", icon: CreditCard },
  { title: "Enrollments", href: "/enrollments", icon: FileBadge },
  // Nuevo grupo para Contabilidad
  {
    title: "Accounting",
    icon: Landmark,
    subItems: [
      { title: "Incomes", href: "/incomes", icon: ArrowRightLeft },
      { title: "Accounting Report", href: "/accounting/report", icon: FileChartColumn },
      { title: "Payouts", href: "/payouts", icon: CircleDollarSign },
    ],
  },
];

export function SidebarNav() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  // Estado para manejar los submenús abiertos
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({
    Accounting: true, // Por defecto, el submenú de contabilidad estará abierto
  });

  const toggleSubmenu = (title: string) => {
    setOpenSubmenus((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  return (
    <aside
      className={cn(
        "min-h-screen border-r border-light-border dark:border-dark-border bg-light-sidebar dark:bg-dark-sidebar transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex items-center justify-between px-4 py-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            {/*<Image src="/logo.png" alt="Logo" width={32} height={32} />*/}
            <span className="font-bold text-lg">Bespoke</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-md hover:bg-light-border dark:hover:bg-dark-border"
        >
          {collapsed ? (
            <Menu className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </button>
      </div>
      <nav className="flex flex-col gap-1 p-2">
        {navItems.map((item) =>
          item.subItems ? (
            // Renderiza un grupo de submenú
            <div key={item.title}>
              <button
                onClick={() => !collapsed && toggleSubmenu(item.title)}
                className={cn(
                  "flex items-center w-full gap-3 px-4 py-2 text-sm rounded-md transition-colors justify-start",
                  // Lógica para resaltar el padre si un hijo está activo
                  item.subItems.some((sub) => pathname === sub.href)
                    ? "text-primary dark:text-white font-semibold"
                    : "text-light-text hover:bg-primary/10 dark:text-dark-text dark:hover:bg-primary/20",
                  collapsed && "justify-center"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!collapsed && (
                  <span className="truncate flex-1 text-left">
                    {item.title}
                  </span>
                )}
                {!collapsed && (
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform",
                      openSubmenus[item.title] && "rotate-180"
                    )}
                  />
                )}
              </button>
              {/* Renderiza los sub-ítems si el submenú está abierto y la barra no está colapsada */}
              {!collapsed && openSubmenus[item.title] && (
                <div className="flex flex-col gap-1 pt-1 pl-6">
                  {item.subItems.map((subItem) => (
                    <Link
                      key={subItem.href}
                      href={subItem.href}
                      className={cn(
                        "flex items-center gap-3 px-4 py-2 text-sm rounded-md transition-colors",
                        pathname === subItem.href
                          ? "bg-secondary text-white hover:bg-secondary/90"
                          : "text-light-text hover:bg-primary hover:text-white dark:text-dark-text dark:hover:text-white"
                      )}
                    >
                      <subItem.icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{subItem.title}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ) : (
            // Renderiza un ítem de enlace normal
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-2 text-sm rounded-md hover:bg-primary/10 transition-colors",
                "justify-start",
                pathname === item.href
                  ? "bg-secondary text-white hover:bg-secondary/90"
                  : "text-light-text hover:bg-primary hover:text-white dark:text-dark-text dark:hover:text-white",
                collapsed && "justify-center"
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span className="truncate">{item.title}</span>}
            </Link>
          )
        )}
      </nav>
    </aside>
  );
}
