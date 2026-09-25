import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { UserPlus, ShieldCheck } from "lucide-react";
import { usersService } from "@/services/users";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { UserAvatar } from "@/components/UserAvatar";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { roleLabel } from "@/utils/format";
import { NewUserDialog } from "@/pages/NewUserDialog";
import { staggerDelay } from "@/utils/motion";

export default function UserManagement() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [tab, setTab] = useState<"users" | "roles">("users");

  const { data: users, isLoading, isError } = useQuery({ queryKey: ["users"], queryFn: usersService.list });
  const { data: rolePermissions } = useQuery({ queryKey: ["role-permissions"], queryFn: usersService.rolePermissions, enabled: tab === "roles" });

  async function toggleActive(id: string, isActive: boolean) {
    await usersService.update(id, { is_active: !isActive });
    queryClient.invalidateQueries({ queryKey: ["users"] });
  }

  return (
    <div>
      <PageHeader
        title="USER MANAGEMENT"
        subtitle="Manage platform users, role assignments, and permission boundaries."
        actions={
          <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
            <UserPlus className="h-4 w-4" /> New User
          </Button>
        }
      />

      <div className="mb-4 flex gap-1.5">
        {(["users", "roles"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`relative rounded-md border px-3 py-1.5 text-xs transition-colors ${tab === t ? "border-accent/40 text-accent" : "border-base-border text-text-secondary hover:text-text-primary"}`}
          >
            {tab === t && <motion.div layoutId="user-mgmt-tab-bg" className="absolute inset-0 rounded-md bg-accent/10" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
            <span className="relative">{t === "users" ? "Users" : "Role Permissions"}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === "users" ? (
          <motion.div key="users" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }} className="panel overflow-hidden">
            {isLoading ? (
              <LoadingState />
            ) : isError ? (
              <ErrorState />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-base-border text-[11px] uppercase tracking-wide text-text-muted">
                      <th className="px-4 py-2.5 font-medium">User</th>
                      <th className="px-4 py-2.5 font-medium">Role</th>
                      <th className="px-4 py-2.5 font-medium">Badge ID</th>
                      <th className="px-4 py-2.5 font-medium">Status</th>
                      <th className="px-4 py-2.5 font-medium">MFA</th>
                      <th className="px-4 py-2.5 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-base-border">
                    {users?.map((u, idx) => (
                      <motion.tr
                        key={u.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: staggerDelay(idx), duration: 0.25 }}
                        whileHover={{ backgroundColor: "rgba(255,255,255,0.03)" }}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <UserAvatar name={u.full_name} size="sm" />
                            <div>
                              <p className="font-medium text-text-primary">{u.full_name}</p>
                              <p className="text-[11px] text-text-muted">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-text-secondary">{roleLabel(u.role)}</td>
                        <td className="px-4 py-3 mono text-xs text-text-muted">{u.badge_id}</td>
                        <td className="px-4 py-3">
                          <Badge tone={u.is_active ? "success" : "neutral"}>{u.is_active ? "Active" : "Disabled"}</Badge>
                        </td>
                        <td className="px-4 py-3">{u.mfa_enabled ? <ShieldCheck className="h-3.5 w-3.5 text-status-success" /> : <span className="text-text-muted text-xs">Off</span>}</td>
                        <td className="px-4 py-3 text-right">
                          <Button variant="ghost" size="sm" onClick={() => toggleActive(u.id, u.is_active)}>
                            {u.is_active ? "Disable" : "Enable"}
                          </Button>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="roles"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="grid grid-cols-1 gap-3 md:grid-cols-2"
          >
            {rolePermissions?.map((rp, idx) => (
              <motion.div
                key={rp.role}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: staggerDelay(idx, 0.06), duration: 0.3 }}
                whileHover={{ y: -2 }}
                className="panel p-4"
              >
                <p className="mb-1 text-sm font-semibold text-text-primary">{roleLabel(rp.role)}</p>
                <p className="mb-2 text-xs text-text-muted">{rp.description}</p>
                <div className="flex flex-wrap gap-1.5">
                  {rp.permissions.map((p) => (
                    <span key={p} className="rounded bg-base-hover px-1.5 py-0.5 text-[10px] text-text-secondary">
                      {p.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <NewUserDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={() => queryClient.invalidateQueries({ queryKey: ["users"] })} />
    </div>
  );
}
