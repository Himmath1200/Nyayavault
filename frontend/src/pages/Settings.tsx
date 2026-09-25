import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { motion } from "framer-motion";
import { ShieldCheck, Sparkles, Server } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { UserAvatar } from "@/components/UserAvatar";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/context/AuthContext";
import { roleLabel } from "@/utils/format";
import { apiClient } from "@/api/client";

export default function Settings() {
  const { user } = useAuth();
  const { data: health } = useQuery({
    queryKey: ["health"],
    queryFn: () => axios.get<{ status: string; ai_enabled: boolean }>(`${apiClient.defaults.baseURL}/health`).then((r) => r.data),
  });

  return (
    <div>
      <PageHeader title="SYSTEM SETTINGS" subtitle="Account profile, security posture, and platform configuration." />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="panel p-4">
          <p className="label-caps mb-3">Account Profile</p>
          <div className="flex items-center gap-3">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.1 }}>
              <UserAvatar name={user?.full_name ?? "?"} size="lg" />
            </motion.div>
            <div>
              <p className="text-sm font-semibold text-text-primary">{user?.full_name}</p>
              <p className="text-xs text-text-muted">{user?.email}</p>
              <Badge tone="accent" className="mt-1.5">{user && roleLabel(user.role)}</Badge>
            </div>
          </div>
          <div className="mt-4 space-y-2 border-t border-base-border pt-3 text-xs">
            <Row label="Badge ID" value={user?.badge_id ?? "—"} />
            <Row label="Department" value={user?.department ?? "—"} />
            <Row label="Account Type" value={user?.is_demo_account ? "Demo Account" : "Standard Account"} />
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08, duration: 0.3 }} className="panel p-4">
          <p className="label-caps mb-3">Security Posture</p>
          <div className="space-y-2.5 text-sm">
            <SettingRow icon={ShieldCheck} label="Multi-Factor Authentication" value={user?.mfa_enabled ? "Enabled" : "Disabled"} ok={!!user?.mfa_enabled} index={0} />
            <SettingRow icon={ShieldCheck} label="Password Hashing" value="bcrypt" ok index={1} />
            <SettingRow icon={ShieldCheck} label="Session Token" value="JWT (short-lived access + refresh)" ok index={2} />
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16, duration: 0.3 }} className="panel p-4 lg:col-span-2">
          <p className="label-caps mb-3">Platform Status</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <SettingRow icon={Server} label="API Connectivity" value={health?.status === "ok" ? "Operational" : "Unreachable"} ok={health?.status === "ok"} index={0} />
            <SettingRow
              icon={Sparkles}
              label="Gemini AI Analysis"
              value={health?.ai_enabled ? "Live (Gemini API)" : "Mock Mode (deterministic, no API key required)"}
              ok={true}
              index={1}
            />
          </div>
          <p className="mt-3 text-[11px] text-text-muted">
            AI understanding, cryptographic integrity (SHA-256), zero-trust authorization, and the audit ledger are independent subsystems by design —
            a Gemini outage never affects security enforcement or evidence integrity guarantees.
          </p>
        </motion.div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-text-muted">{label}</span>
      <span className="text-text-secondary">{value}</span>
    </div>
  );
}

function SettingRow({ icon: Icon, label, value, ok, index }: { icon: typeof ShieldCheck; label: string; value: string; ok: boolean; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.15 + index * 0.06, duration: 0.25 }}
      whileHover={{ x: 2 }}
      className="flex items-center justify-between rounded-md border border-base-border px-3 py-2"
    >
      <div className="flex items-center gap-2 text-text-secondary">
        {ok ? (
          <motion.span animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 2.4, repeat: Infinity }}>
            <Icon className="h-3.5 w-3.5 text-status-success" />
          </motion.span>
        ) : (
          <Icon className="h-3.5 w-3.5 text-status-warning" />
        )}
        {label}
      </div>
      <span className="text-xs text-text-muted">{value}</span>
    </motion.div>
  );
}
