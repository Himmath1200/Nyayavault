import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, ShieldCheck, LogOut, ChevronDown, Folder, FileText, Fingerprint, UserRound } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { UserAvatar } from "@/components/UserAvatar";
import { roleLabel } from "@/utils/format";
import { searchService } from "@/services/search";
import { NotificationBell } from "@/components/NotificationPanel";
import { can, PERMISSIONS } from "@/utils/rbac";
import { securityService } from "@/services/security";
import { SearchResult } from "@/types";

const RESULT_ICON: Record<SearchResult["type"], typeof Folder> = {
  case: Folder,
  document: FileText,
  evidence: Fingerprint,
  user: UserRound,
};

const RESULT_LABEL: Record<SearchResult["type"], string> = {
  case: "Case",
  document: "Document",
  evidence: "Evidence",
  user: "User",
};

export function TopBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const { data: results, isFetching: searching } = useQuery({
    queryKey: ["global-search", query],
    queryFn: () => searchService.global(query),
    enabled: query.trim().length > 1,
  });

  const { data: alerts } = useQuery({
    queryKey: ["security-status"],
    queryFn: () => securityService.listAlerts("OPEN"),
    enabled: can(user?.role, PERMISSIONS.SECURITY_VIEW),
    refetchInterval: 60_000,
  });

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowResults(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const criticalAlerts = alerts?.filter((a) => a.severity === "CRITICAL" || a.severity === "HIGH").length ?? 0;

  return (
    <header className="flex h-14 items-center gap-4 border-b border-base-border bg-base-panel px-5 shrink-0">
      <div ref={searchRef} className="relative flex-1 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowResults(true);
          }}
          onFocus={() => setShowResults(true)}
          placeholder="Search cases, evidence, documents, officers..."
          className="w-full rounded-md border border-base-border bg-base-bg py-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent"
        />
        {showResults && query.trim().length > 1 && (
          <div className="absolute left-0 right-0 top-11 z-40 max-h-80 overflow-y-auto panel">
            {searching && !results ? (
              <p className="px-3 py-3 text-xs text-text-muted">Searching...</p>
            ) : results && results.length > 0 ? (
              results.map((r) => {
                const Icon = RESULT_ICON[r.type];
                return (
                  <button
                    key={`${r.type}-${r.id}`}
                    onClick={() => {
                      navigate(r.type === "user" ? "/users" : `/cases/${r.case_id ?? r.id}`);
                      setShowResults(false);
                      setQuery("");
                    }}
                    className="flex w-full items-center gap-2.5 border-b border-base-border px-3 py-2 text-left last:border-0 hover:bg-base-hover"
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0 text-accent" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-text-primary">{r.title}</p>
                      <p className="mono truncate text-[11px] text-text-muted">{r.subtitle}</p>
                    </div>
                    <span className="label-caps shrink-0 text-text-muted">{RESULT_LABEL[r.type]}</span>
                  </button>
                );
              })
            ) : (
              <p className="px-3 py-3 text-xs text-text-muted">No matching cases, documents, evidence, or officers found.</p>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5 rounded-md border border-base-border px-2.5 py-1.5 text-xs">
        <ShieldCheck className={criticalAlerts > 0 ? "h-3.5 w-3.5 text-status-warning" : "h-3.5 w-3.5 text-status-success"} />
        <span className={criticalAlerts > 0 ? "text-status-warning" : "text-status-success"}>
          {criticalAlerts > 0 ? `${criticalAlerts} Active Threat${criticalAlerts > 1 ? "s" : ""}` : "System Secure"}
        </span>
      </div>

      <NotificationBell />

      <div className="relative">
        <button onClick={() => setMenuOpen((o) => !o)} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-base-hover">
          <UserAvatar name={user?.full_name ?? "?"} size="sm" />
          <div className="hidden text-left leading-tight sm:block">
            <p className="text-xs font-medium text-text-primary">{user?.full_name}</p>
            <p className="text-[10px] text-text-muted">{user && roleLabel(user.role)}</p>
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-text-muted" />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-11 z-40 w-48 panel py-1">
            <div className="border-b border-base-border px-3 py-2">
              <p className="text-xs font-medium text-text-primary">{user?.email}</p>
              <p className="text-[10px] text-text-muted">Badge {user?.badge_id}</p>
            </div>
            <button
              onClick={() => {
                logout();
                navigate("/login");
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-xs text-status-critical hover:bg-base-hover"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
