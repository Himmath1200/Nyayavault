import { FormEvent, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Shield, ShieldCheck, ShieldX, Lock, Eye, EyeOff, AlertCircle } from "lucide-react";
import { verifyService } from "@/services/verify";
import { authService } from "@/services/auth";
import { useAuth } from "@/context/AuthContext";
import { apiErrorMessage } from "@/api/client";
import { LoadingState } from "@/components/ui/States";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatDate } from "@/utils/format";

type UnlockStage = "prompt" | "credentials" | "mfa" | "step-up" | "opening";

export default function PublicVerify() {
  const { verificationId } = useParams<{ verificationId: string }>();
  const navigate = useNavigate();
  const { user, setSession } = useAuth();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["public-verify", verificationId],
    queryFn: () => verifyService.publicVerify(verificationId!),
    enabled: !!verificationId,
    retry: false,
  });

  const [stage, setStage] = useState<UnlockStage>("prompt");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function openCertificate() {
    setStage("opening");
    navigate(`/certificates/${verificationId}`);
  }

  function startUnlock() {
    setError("");
    setStage(user ? "step-up" : "credentials");
  }

  async function handleStepUp(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await authService.stepUpVerify(mfaCode, `qr_certificate:${verificationId}`);
      openCertificate();
    } catch (err) {
      setError(apiErrorMessage(err, "Invalid verification code."));
    } finally {
      setLoading(false);
    }
  }

  async function handleCredentials(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const resp = await authService.login(email, password);
      if (resp.mfa_required) {
        setStage("mfa");
      } else if (resp.access_token && resp.refresh_token && resp.user) {
        setSession(resp.access_token, resp.refresh_token, resp.user);
        openCertificate();
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
      openCertificate();
    } catch (err) {
      setError(apiErrorMessage(err, "Invalid verification code."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-base-bg px-4 py-10">
      <div className="mx-auto max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 14 }}
            className="mb-3 flex h-14 w-14 items-center justify-center rounded-xl border border-accent/30 bg-accent/10 text-accent"
          >
            <Shield className="h-7 w-7" />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.15 }}
            className="text-3xl font-extrabold tracking-wide text-text-primary"
          >
            NYAYAVAULT
          </motion.h1>
          <p className="mt-1 text-xs text-text-muted">Public Evidence Verification</p>
        </div>

        {isLoading ? (
          <LoadingState label="Verifying record..." />
        ) : isError || !data ? (
          <div className="panel p-6 text-center">
            <ShieldX className="mx-auto mb-2 h-8 w-8 text-status-critical" />
            <p className="text-sm text-status-critical">No verification record found for this code.</p>
          </div>
        ) : (
          <>
            <motion.div initial={{ opacity: 0, scale: 0.97, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }} className="panel overflow-hidden">
              <div className="flex items-center justify-between bg-status-success/10 px-4 py-3 border-b border-status-success/20">
                <div className="flex items-center gap-2 text-status-success">
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring", stiffness: 400, damping: 15 }}>
                    <ShieldCheck className="h-5 w-5" />
                  </motion.span>
                  <span className="text-sm font-semibold">VERIFIED RECORD</span>
                </div>
                <span className="mono text-[11px] text-text-muted">{data.certificate_id}</span>
              </div>
              <div className="space-y-3 p-4 text-sm">
                <Row label="Evidence ID" value={data.evidence_id} mono />
                <Row label="Case Number" value={data.case_number} mono />
                <Row label="Document Type" value={data.document_type.replace(/_/g, " ")} />
                <Row label="Integrity Status" value={data.integrity_status} />
                <Row label="Verified" value={formatDate(data.verification_timestamp)} />
                <div>
                  <p className="label-caps mb-1">SHA-256</p>
                  <p className="mono break-all rounded bg-base-bg px-2.5 py-1.5 text-[11px] text-text-secondary">{data.sha256_hash}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 border-t border-base-border pt-3 text-xs">
                  <CheckLine ok={data.hash_verified} label="Hash Verified" />
                  <CheckLine ok={data.custody_verified} label="Custody Verified" />
                  <CheckLine ok={data.signature_verified} label="Signature Valid" />
                  <CheckLine ok={data.audit_complete} label="Audit Complete" />
                </div>
              </div>
              <div className="border-t border-base-border bg-base-bg/50 px-4 py-3 text-[11px] text-text-muted">{data.disclaimer}</div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.3 }} className="panel mt-4 overflow-hidden">
              <div className="panel-header">
                <p className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                  <Lock className="h-4 w-4 text-accent" /> Open Full Certificate
                </p>
              </div>
              <div className="p-4">
                {stage === "prompt" && (
                  <div className="text-center">
                    <p className="mb-3 text-xs text-text-secondary">
                      {user
                        ? `Signed in as ${user.full_name}. Re-enter your verification code to open the full certificate.`
                        : "Sign in with your NyayaVault account to open the full certificate."}
                    </p>
                    <Button variant="primary" size="sm" onClick={startUnlock}>
                      <Lock className="h-3.5 w-3.5" /> Enter Verification Code
                    </Button>
                  </div>
                )}

                {stage === "step-up" && (
                  <form onSubmit={handleStepUp} className="space-y-3">
                    <p className="text-xs text-text-secondary">Enter your 6-digit MFA code to confirm it's you, {user?.full_name}.</p>
                    <Input
                      inputMode="numeric"
                      maxLength={6}
                      required
                      autoFocus
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value)}
                      placeholder="123456"
                      className="mono text-center text-lg tracking-[0.5em]"
                    />
                    {error && (
                      <div className="flex items-center gap-2 rounded-md border border-status-critical/30 bg-status-critical/10 px-3 py-2 text-xs text-status-critical">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
                      </div>
                    )}
                    <Button type="submit" variant="primary" className="w-full" disabled={loading}>
                      {loading ? "Verifying..." : "Verify & Open Certificate"}
                    </Button>
                  </form>
                )}

                {stage === "credentials" && (
                  <form onSubmit={handleCredentials} className="space-y-3">
                    <div>
                      <label className="label-caps mb-1.5 block">Email</label>
                      <Input type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@nyayavault.demo" />
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
                          className="pr-10"
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
                    {error && (
                      <div className="flex items-center gap-2 rounded-md border border-status-critical/30 bg-status-critical/10 px-3 py-2 text-xs text-status-critical">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
                      </div>
                    )}
                    <Button type="submit" variant="primary" className="w-full" disabled={loading}>
                      {loading ? "Verifying..." : "Continue"}
                    </Button>
                  </form>
                )}

                {stage === "mfa" && (
                  <form onSubmit={handleMfa} className="space-y-3">
                    <p className="text-xs text-text-secondary">Multi-factor verification required for {email}</p>
                    <Input
                      inputMode="numeric"
                      maxLength={6}
                      required
                      autoFocus
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value)}
                      placeholder="123456"
                      className="mono text-center text-lg tracking-[0.5em]"
                    />
                    {error && (
                      <div className="flex items-center gap-2 rounded-md border border-status-critical/30 bg-status-critical/10 px-3 py-2 text-xs text-status-critical">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
                      </div>
                    )}
                    <Button type="submit" variant="primary" className="w-full" disabled={loading}>
                      {loading ? "Verifying..." : "Verify & Open Certificate"}
                    </Button>
                  </form>
                )}

                {stage === "opening" && <LoadingState label="Opening certificate..." />}
              </div>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-text-muted">{label}</span>
      <span className={`text-text-primary ${mono ? "mono" : ""}`}>{value}</span>
    </div>
  );
}

function CheckLine({ ok, label }: { ok: boolean; label: string }) {
  return <div className={`flex items-center gap-1.5 ${ok ? "text-status-success" : "text-status-critical"}`}>{ok ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldX className="h-3.5 w-3.5" />} {label}</div>;
}
