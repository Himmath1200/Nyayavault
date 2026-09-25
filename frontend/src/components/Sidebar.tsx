import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Folder,
  Vault,
  Fingerprint,
  Network,
  GitCommitHorizontal,
  History,
  Sparkles,
  ShieldAlert,
  ScrollText,
  Landmark,
  Users,
  Settings,
  ChevronsLeft,
  Shield,
} from "lucide-react";
import { useState } from "react";
import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/utils/cn";
import { useAuth } from "@/context/AuthContext";
import { can, PERMISSIONS } from "@/utils/rbac";

const navStagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045 } },
};
const navItem = {
  hidden: { opacity: 0, x: -14 },
  show: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 340, damping: 28 } },
};

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  permission?: (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
}

const NAV: NavItem[] = [
  { to: "/", label: "Command Center", icon: LayoutDashboard, end: true },
  { to: "/cases", label: "Cases", icon: Folder },
  { to: "/vault", label: "Document Vault", icon: Vault },
  { to: "/evidence", label: "Evidence", icon: Fingerprint, permission: PERMISSIONS.EVIDENCE_VIEW },
  { to: "/intelligence", label: "Case Intelligence", icon: Network, permission: PERMISSIONS.AI_USE },
  { to: "/timeline", label: "Timeline", icon: GitCommitHorizontal, permission: PERMISSIONS.AI_USE },
  { to: "/custody", label: "Chain of Custody", icon: History, permission: PERMISSIONS.CUSTODY_VIEW },
  { to: "/ai-insights", label: "AI Insights", icon: Sparkles, permission: PERMISSIONS.AI_USE },
  { to: "/security", label: "Security", icon: ShieldAlert, permission: PERMISSIONS.SECURITY_VIEW },
  { to: "/audit", label: "Audit Trail", icon: ScrollText, permission: PERMISSIONS.AUDIT_VIEW },
  { to: "/court-verification", label: "Court Verification", icon: Landmark, permission: PERMISSIONS.COURT_VERIFY },
  { to: "/users", label: "Users", icon: Users, permission: PERMISSIONS.USER_MANAGE },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useAuth();

  return (
    <aside
      className={cn(
        "relative flex flex-col overflow-hidden border-r border-base-border bg-base-panel transition-all duration-200 shrink-0",
        collapsed ? "w-[68px]" : "w-60"
      )}
    >
      {/* Ambient drifting glow, ties the sidebar back to the rest of the animated shell */}
      <motion.div
        className="pointer-events-none absolute -left-10 top-1/3 h-52 w-52 rounded-full bg-accent/10 blur-3xl"
        animate={{ opacity: [0.25, 0.55, 0.25], y: [0, 24, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative flex items-center gap-2 px-4 h-14 border-b border-base-border">
        <motion.div
          className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent/15 text-accent"
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          <motion.div
            className="pointer-events-none absolute inset-0 rounded-md bg-accent/30 blur-md"
            animate={{ opacity: [0.3, 0.7, 0.3], scale: [0.9, 1.15, 0.9] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
          <Shield className="relative z-10 h-4 w-4" />
        </motion.div>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25 }}
            className="leading-tight overflow-hidden"
          >
            <p className="text-sm font-bold tracking-wide text-text-primary">NYAYAVAULT</p>
            <p className="text-[10px] text-text-muted">Evidence Intelligence</p>
          </motion.div>
        )}
      </div>

      <motion.nav
        variants={navStagger}
        initial="hidden"
        animate="show"
        className="relative flex-1 overflow-y-auto py-3 px-2 space-y-0.5"
      >
        {NAV.filter((item) => !item.permission || can(user?.role, item.permission)).map((item) => (
          <motion.div key={item.to} variants={navItem} whileHover={{ x: 3 }}>
            <NavLink
              to={item.to}
              end={item.end ?? false}
              className={({ isActive }) =>
                cn(
                  "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  isActive ? "text-accent font-medium" : "text-text-secondary hover:bg-base-hover hover:text-text-primary"
                )
              }
              title={collapsed ? item.label : undefined}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active-pill"
                      className="absolute inset-0 rounded-md bg-accent/10 ring-1 ring-accent/20"
                      transition={{ type: "spring", stiffness: 500, damping: 38 }}
                    />
                  )}
                  <item.icon className="relative z-10 h-4 w-4 shrink-0" />
                  {!collapsed && <span className="relative z-10 truncate">{item.label}</span>}
                </>
              )}
            </NavLink>
          </motion.div>
        ))}
      </motion.nav>

      <motion.button
        onClick={() => setCollapsed((c) => !c)}
        whileTap={{ scale: 0.94 }}
        className="relative flex items-center gap-2 border-t border-base-border px-4 py-3 text-xs text-text-muted hover:text-text-primary"
      >
        <motion.div animate={{ rotate: collapsed ? 180 : 0 }} transition={{ type: "spring", stiffness: 300, damping: 22 }}>
          <ChevronsLeft className="h-4 w-4" />
        </motion.div>
        {!collapsed && "Collapse"}
      </motion.button>
    </aside>
  );
}
