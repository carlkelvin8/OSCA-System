"use client";

/**
 * Dashboard shell — Direction 1: Clean Professional
 * Dark navy sidebar (#0f172a), blue active item (#2563eb),
 * white topbar with breadcrumb + user avatar, light content bg (#f5f6f8).
 * Aligned to OSCA PRD v2 frontend spec.
 */

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  Users,
  CalendarCheck,
  Package,
  BarChart3,
  LogOut,
  Camera,
  LayoutDashboard,
  ChevronRight,
  Bell,
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import type { UserRole } from "@/types";

// ── Nav definition ────────────────────────────────────────────────────────────

const navItems: {
  href: string;
  label: string;
  icon: React.ElementType;
  roles: UserRole[];
}[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: ["admin", "coach", "pe_instructor", "director", "student"],
  },
  {
    href: "/dashboard/attendance",
    label: "Attendance",
    icon: CalendarCheck,
    roles: ["admin", "coach", "student"],
  },
  {
    href: "/dashboard/inventory",
    label: "Inventory",
    icon: Package,
    roles: ["admin", "pe_instructor"],
  },
  {
    href: "/dashboard/users",
    label: "Users",
    icon: Users,
    roles: ["admin"],
  },
  {
    href: "/dashboard/reports",
    label: "Reports",
    icon: BarChart3,
    roles: ["admin", "coach", "director"],
  },
  {
    href: "/kiosk",
    label: "Kiosk Mode",
    icon: Camera,
    roles: ["admin"],
  },
];

// ── Role badge label ───────────────────────────────────────────────────────────

const roleLabel: Record<UserRole, string> = {
  admin: "Admin",
  coach: "Coach",
  pe_instructor: "PE Instructor",
  student: "Student",
  director: "Director",
};

// ── Breadcrumb helper ─────────────────────────────────────────────────────────

function useBreadcrumb(pathname: string) {
  const segments = pathname.replace("/dashboard", "").split("/").filter(Boolean);
  const crumbs: { label: string; href: string }[] = [
    { label: "Dashboard", href: "/dashboard" },
  ];
  let path = "/dashboard";
  for (const seg of segments) {
    path += `/${seg}`;
    crumbs.push({
      label: seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, " "),
      href: path,
    });
  }
  return crumbs;
}

// ── Layout ────────────────────────────────────────────────────────────────────

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, logout, fetchCurrentUser } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const crumbs = useBreadcrumb(pathname);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  useEffect(() => {
    if (!isAuthenticated && user === null) {
      router.push("/login");
    }
  }, [isAuthenticated, user, router]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f6f8]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#2563eb]" />
      </div>
    );
  }

  const visibleNav = navItems.filter((item) => item.roles.includes(user.role));

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  // Initials for avatar
  const initials =
    (user.first_name?.[0] ?? "") + (user.last_name?.[0] ?? "");

  return (
    <div className="flex h-screen bg-[#f5f6f8]">
      {/* ── Sidebar ───────────────────────────────────────────────────────── */}
      <aside className="w-52 bg-[#0f172a] text-white flex flex-col shrink-0">
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-4 py-4 border-b border-white/8">
          <div className="w-9 h-9 rounded-lg bg-[#2563eb] flex items-center justify-center text-white font-bold text-lg shrink-0">
            O
          </div>
          <div>
            <p className="text-sm font-bold text-[#f8fafc] leading-tight">OSCA System</p>
            <p className="text-[11px] text-[#94a3b8]">NAAP-Villamor</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                  isActive
                    ? "bg-[#2563eb] text-white"
                    : "text-[#94a3b8] hover:text-[#e2e8f0] hover:bg-white/6"
                }`}
              >
                <Icon size={17} className="shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="px-2 py-3 border-t border-white/8 space-y-0.5">
          <div className="flex items-center gap-2.5 px-3 py-2">
            <div className="w-7 h-7 rounded-full bg-[#2563eb] flex items-center justify-center text-white text-xs font-semibold shrink-0">
              {initials.toUpperCase() || "?"}
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-[#f1f5f9] truncate leading-tight">
                {user.full_name}
              </p>
              <p className="text-[11px] text-[#94a3b8]">{roleLabel[user.role]}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-[#94a3b8] hover:text-white hover:bg-white/6 rounded-lg transition-colors"
          >
            <LogOut size={15} className="shrink-0" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main area ─────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-12 bg-white border-b border-[#e5e7eb] flex items-center px-6 gap-3 shrink-0">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-xs text-[#6b7280] flex-1 min-w-0">
            {crumbs.map((crumb, i) => (
              <span key={crumb.href} className="flex items-center gap-1.5">
                {i > 0 && <ChevronRight size={12} className="text-[#d1d5db]" />}
                {i === crumbs.length - 1 ? (
                  <span className="font-medium text-[#111827]">{crumb.label}</span>
                ) : (
                  <Link href={crumb.href} className="hover:text-[#374151] transition-colors">
                    {crumb.label}
                  </Link>
                )}
              </span>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2.5">
            <button className="relative w-8 h-8 flex items-center justify-center text-[#6b7280] hover:bg-[#f3f4f6] rounded-full transition-colors">
              <Bell size={16} />
              {/* Dot indicator — can be wired to a notification count */}
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 border-2 border-white rounded-full" />
            </button>
            <div className="w-8 h-8 rounded-full bg-[#2563eb] flex items-center justify-center text-white text-xs font-semibold">
              {initials.toUpperCase() || "?"}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
