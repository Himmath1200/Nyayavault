import { FormEvent, useState } from "react";
import { CheckCircle2, Copy } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import { usersService } from "@/services/users";
import { apiErrorMessage } from "@/api/client";
import { UserRole } from "@/types";
import { roleLabel } from "@/utils/format";

export function NewUserDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [badgeId, setBadgeId] = useState("");
  const [role, setRole] = useState<UserRole>("INVESTIGATING_OFFICER");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<{ email: string; password: string; role: UserRole } | null>(null);
  const [copied, setCopied] = useState(false);

  function reset() {
    setFullName("");
    setEmail("");
    setBadgeId("");
    setPassword("");
    setRole("INVESTIGATING_OFFICER");
    setError("");
    setCreated(null);
    setCopied(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await usersService.create({ email, full_name: fullName, badge_id: badgeId, role, password });
      setCreated({ email, password, role });
      onCreated();
    } catch (err) {
      setError(apiErrorMessage(err, "Could not create user."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title={created ? "User Created" : "Create User"}
    >
      {created ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-md border border-status-success/30 bg-status-success/10 px-3 py-2.5 text-sm text-status-success">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Account created as {roleLabel(created.role)}. They can sign in immediately at the login page.
          </div>
          <div className="space-y-2 rounded-md border border-base-border bg-base-bg px-3 py-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Email</span>
              <span className="mono text-text-primary">{created.email}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Password</span>
              <span className="mono text-text-primary">{created.password}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted">MFA code (demo)</span>
              <span className="mono text-text-primary">123456</span>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="w-full"
            onClick={() => {
              navigator.clipboard.writeText(`${created.email} / ${created.password}`).catch(() => undefined);
              setCopied(true);
            }}
          >
            <Copy className="h-3.5 w-3.5" /> {copied ? "Copied" : "Copy credentials"}
          </Button>
          <p className="text-[11px] text-text-muted">
            Give these credentials to the account holder directly — NyayaVault has no email delivery configured in this prototype, so nothing is sent
            automatically.
          </p>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={reset}>
              Create Another
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                reset();
                onClose();
              }}
            >
              Done
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <Label>Full Name</Label>
            <Input required value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Badge ID</Label>
              <Input required value={badgeId} onChange={(e) => setBadgeId(e.target.value)} />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
                <option value="SYSTEM_ADMIN">System Admin</option>
                <option value="INVESTIGATING_OFFICER">Investigating Officer</option>
                <option value="FORENSIC_OFFICER">Forensic Officer</option>
                <option value="COURT_OFFICER">Court Officer</option>
                <option value="LEGAL_OFFICER">Legal Officer</option>
                <option value="AUDITOR">Auditor</option>
                <option value="READ_ONLY_REVIEWER">Read-Only Reviewer</option>
              </Select>
            </div>
          </div>
          <div>
            <Label>Temporary Password</Label>
            <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} />
          </div>
          {error && <p className="text-xs text-status-critical">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                reset();
                onClose();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? "Creating..." : "Create User"}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
