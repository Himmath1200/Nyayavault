import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff, Shield, ShieldCheck, ShieldPlus, Fingerprint, Lock, AlertCircle } from "lucide-react";
import { authService } from "@/services/auth";
import { useAuth } from "@/context/AuthContext";
import { apiErrorMessage } from "@/api/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LoginShowcase } from "@/components/LoginShowcase";

const DEMO_ACCOUNTS = [
  { email: "admin@nyayavault.demo", role: "System Admin" },
  { email: "officer@nyayavault.demo", role: "Investigating Officer" },
  { email: "forensic@nyayavault.demo", role: "Forensic Officer" },
  { email: "court@nyayavault.demo", role: "Court Officer" },
  { email: "auditor@nyayavault.demo", role: "Auditor" },
  { email: "legal@nyayavault.demo", role: "Legal Officer" },
  { email: "reviewer@nyayavault.demo", role: "Read-Only Reviewer" },
];

export default function Login() {
  const navigate = useNavigate();
  const { setSession } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(false);
  const [stage, setStage] = useState<"credentials" | "mfa">("credentials");
  const [mfaCode, setMfaCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const resp = await authService.login(email, password, rememberDevice);
      if (resp.mfa_required) {
        setStage("mfa");
      } else if (resp.access_token && resp.refresh_token && resp.user) {
        setSession(resp.access_token, resp.refresh_token, resp.user);
        navigate("/");
      }
    } catch (err) {
      setError(apiErrorMessage(err, "Invalid email or password."));
    } finally {
      setLoading(false);
    }
  }

  async function handleMfa(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const resp = await authService.verifyMfa(email, mfaCode);
      setSession(resp.access_token, resp.refresh_token, resp.user);
      navigate("/");
    } catch (err) {
      setError(apiErrorMessage(err, "Invalid verification code."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center overflow-hidden bg-base-bg px-4 py-10 lg:px-12">
      <SecurityBackdrop />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center gap-12 lg:flex-row lg:items-center lg:justify-between">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="w-full max-w-md shrink-0">
        <div className="mb-7 flex flex-col items-center text-center lg:items-start lg:text-left">
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 14, delay: 0.1 }}
            className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-accent/30 bg-accent/10 text-accent"
          >
            <Shield className="h-8 w-8" />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.25 }}
            className="text-4xl font-extrabold tracking-wide text-text-primary sm:text-5xl"
          >
            NYAYAVAULT
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.35 }}
            className="mt-2 text-sm text-text-secondary"
          >
            Secure Digital Evidence &amp; Legal Intelligence Platform
          </motion.p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.4 }}
            className="mt-3 max-w-xs text-xs italic text-text-muted"
          >
            "Every Document. Every Action. Every Proof. Verifiable."
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="panel p-7"
        >
          {stage === "credentials" ? (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="label-caps mb-1.5 block">Email / Username</label>
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@nyayavault.demo"
                  autoFocus
                  className="h-11 text-base"
                />
              </div>
              <div>
                <label className="label-caps mb-1.5 block">Password</label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-11 pr-10 text-base"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs text-text-secondary">
                <input type="checkbox" checked={rememberDevice} onChange={(e) => setRememberDevice(e.target.checked)} className="accent-accent" />
                Remember this device (skip MFA for 30 days)
              </label>

              {error && (
                <div className="flex items-center gap-2 rounded-md border border-status-critical/30 bg-status-critical/10 px-3 py-2 text-xs text-status-critical">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
                </div>
              )}

              <Button type="submit" variant="primary" className="h-12 w-full text-base" disabled={loading}>
                {loading ? "Authenticating..." : "Sign In Securely"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleMfa} className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <Fingerprint className="h-4 w-4 text-accent" />
                Multi-factor verification required for {email}
              </div>
              <div>
                <label className="label-caps mb-1.5 block">6-Digit Verification Code</label>
                <Input
                  inputMode="numeric"
                  maxLength={6}
                  required
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  placeholder="123456"
                  className="mono h-12 text-center text-xl tracking-[0.5em]"
                  autoFocus
                />
                <p className="mt-1.5 text-[11px] text-text-muted">Demo code: 123456</p>
              </div>
              {error && (
                <div className="flex items-center gap-2 rounded-md border border-status-critical/30 bg-status-critical/10 px-3 py-2 text-xs text-status-critical">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
                </div>
              )}
              <Button type="submit" variant="primary" className="h-12 w-full text-base" disabled={loading}>
                {loading ? "Verifying..." : "Verify & Sign In"}
              </Button>
              <button type="button" onClick={() => setStage("credentials")} className="w-full text-center text-xs text-text-muted hover:text-text-secondary">
                Back to credentials
              </button>
            </form>
          )}
        </motion.div>

        <div className="mt-4 flex items-start gap-2 rounded-md border border-base-border bg-base-panel/60 px-3 py-2.5 text-[11px] text-text-muted">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
          This is a restricted government system prototype. All access attempts are logged and monitored. Unauthorized access is prohibited.
        </div>

        <details className="mt-4 rounded-md border border-base-border bg-base-panel/60 px-3 py-2.5">
          <summary className="cursor-pointer text-xs font-medium text-text-secondary">DEMO ACCOUNTS — password: Demo@1234</summary>
          <div className="mt-2 grid grid-cols-1 gap-1">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.email}
                type="button"
                onClick={() => {
                  setEmail(acc.email);
                  setPassword("Demo@1234");
                }}
                className="flex items-center justify-between rounded px-2 py-1.5 text-left text-[11px] hover:bg-base-hover"
              >
                <span className="mono text-text-secondary">{acc.email}</span>
                <span className="text-text-muted">{acc.role}</span>
              </button>
            ))}
          </div>
        </details>

        <div className="mt-3 flex items-start gap-2 rounded-md border border-base-border bg-base-panel/60 px-3 py-2.5 text-[11px] text-text-muted">
          <ShieldPlus className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
          <span>
            New to the platform? NyayaVault does not offer public self-registration by design — accounts are created only by a{" "}
            <span className="text-text-secondary font-medium">System Admin</span> (sign in as <span className="mono">admin@nyayavault.demo</span> →{" "}
            <span className="text-text-secondary font-medium">Users → New User</span>). Once created, sign in here with that account's email and
            password like any other.
          </span>
        </div>
      </motion.div>

      <div className="hidden w-full max-w-xl lg:block">
        <LoginShowcase />
      </div>
      </div>
    </div>
  );
}

function SecurityBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-50">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(56,189,248,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.06) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <motion.div
        className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/10 blur-3xl"
        animate={{ scale: [1, 1.12, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Biometric-style scan sweep */}
      <motion.div
        className="absolute inset-x-0 h-32"
        style={{ background: "linear-gradient(180deg, transparent, rgba(56,189,248,0.12), transparent)" }}
        animate={{ y: ["-10%", "110%"] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "linear" }}
      />

      {/* Corner targeting brackets */}
      {[
        "left-[14%] top-[18%] border-l border-t",
        "right-[14%] top-[18%] border-r border-t",
        "left-[14%] bottom-[18%] border-l border-b",
        "right-[14%] bottom-[18%] border-r border-b",
      ].map((pos) => (
        <motion.div
          key={pos}
          className={`absolute h-10 w-10 ${pos} border-accent/25`}
          animate={{ opacity: [0.25, 0.6, 0.25] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}

      <motion.div
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="absolute right-10 top-16 flex items-center gap-1.5 text-[10px] text-accent/60"
      >
        <ShieldCheck className="h-3 w-3" /> AES-256 · SHA-256 · JWT
      </motion.div>
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.55, duration: 0.5 }}
        className="absolute left-10 bottom-16 flex items-center gap-1.5 text-[10px] text-accent/60"
      >
        <Fingerprint className="h-3 w-3" /> Zero-Trust Access Control
      </motion.div>
    </div>
  );
}
