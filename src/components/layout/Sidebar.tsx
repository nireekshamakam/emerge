"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Newspaper,
  TrendingUp,
  BarChart3,
  Rocket,
  CalendarDays,
  Users,
  Kanban,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/news", label: "News", icon: Newspaper },
  { href: "/markets", label: "Markets", icon: TrendingUp },
  { href: "/stocks", label: "Stocks", icon: BarChart3 },
  { href: "/ipo", label: "IPOs", icon: Rocket },
  { href: "/earnings", label: "Earnings", icon: CalendarDays },
  { href: "/meetings", label: "Meetings", icon: Users },
  { href: "/pipeline", label: "Pipeline", icon: Kanban },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "fixed left-0 top-8 z-40 h-[calc(100vh-2rem)] bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-200 shadow-[2px_0_12px_rgba(236,72,153,0.08)]",
        collapsed ? "w-16" : "w-56"
      )}
    >
      <div className="flex items-center justify-between h-14 px-4 border-b border-sidebar-border">
        {!collapsed && (
          <Link href="/" className="flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-pink-500" />
            <h1 className="text-lg font-bold gradient-text tracking-tight">
              Emerge
            </h1>
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded-md hover:bg-pink-100 text-pink-600 cursor-pointer transition-colors"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      <nav className="flex-1 py-4 space-y-1 px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                isActive
                  ? "bg-gradient-to-r from-pink-500 to-fuchsia-500 text-white shadow-sm shadow-pink-300/50"
                  : "text-sidebar-foreground/70 hover:bg-pink-100/80 hover:text-pink-700"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-4">
        {!collapsed && (
          <p className="text-[10px] text-sidebar-foreground/60 tracking-wider uppercase">
            ♡ it girl terminal
          </p>
        )}
      </div>
    </aside>
  );
}
