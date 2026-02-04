/**
 * Sidebar Navigation Component
 * Session 188: Admin dashboard navigation
 */

"use client";

import { logoutAdmin } from "@/lib/auth";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import "./Sidebar.css";

interface NavItem {
  name: string;
  href: string;
  icon: string;
}

const navItems: NavItem[] = [
  { name: "Overview", href: "/dashboard", icon: "📊" },
  { name: "Users", href: "/dashboard/users", icon: "👥" },
  { name: "Moderation", href: "/dashboard/moderation", icon: "🛑" },
  { name: "Analytics", href: "/dashboard/analytics", icon: "📈" },
  { name: "Content", href: "/dashboard/content", icon: "📝" },
  { name: "System", href: "/dashboard/system", icon: "⚙️" },
  { name: "API Keys", href: "/dashboard/api-keys", icon: "🔑" },
  { name: "Security", href: "/dashboard/security", icon: "🛡️" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logoutAdmin();
      router.push("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">L</div>
        <div className="sidebar-brand">
          <div className="sidebar-title">Lokifi Admin</div>
          <div className="sidebar-subtitle">Operations Console</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} className={`sidebar-link ${isActive ? "active" : ""}`}>
              <span className="sidebar-icon">{item.icon}</span>
              <span className="sidebar-text">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <button onClick={handleLogout} className="sidebar-logout" type="button">
          <span className="sidebar-icon">🚪</span>
          <span className="sidebar-text">Logout</span>
        </button>
      </div>
    </aside>
  );
}
