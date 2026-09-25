import { FormEvent, useState } from "react";
import { MailCheck, ShieldAlert, AlertCircle } from "lucide-react";
import { documentsService } from "@/services/documents";
import { apiErrorMessage } from "@/api/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AccessPurpose } from "@/types";
import { useToast } from "@/context/ToastContext";

/**
 * Step-up gate for HIGHLY_CONFIDENTIAL documents: a one-time code is required on top of the
 * already-granted zero-trust access decision before the file content is released. This
 * prototype has no real SMTP configured, so the "email" is delivered as a disclosed demo code
 * (shown here and in the notification bell) rather than an actual message — the same pattern
 * the platform already uses for its login MFA step.
 */
export function EmailVerificationGate({
  documentId,
  purpose,
  maskedEmailHint,
  onVerified,
}: {
  documentId: string;
  purpose: AccessPurpose;
  maskedEmailHint?: string;
  onVerified: () => void;
}) {
  const [stage, setStage] = useState<"prompt" | "code-sent">("prompt");
  const [maskedEmail, setMaskedEmail] = useState(maskedEmailHint ?? "");
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { push } = useToast();

  async function handleSendCode() {
    setError("");
    setLoading(true);
    try {
      const res = await documentsService.requestEmailVerification(documentId, purpose);
      setMaskedEmail(res.masked_email);
      setDemoCode(res.demo_code);
      setStage("code-sent");
      push({ tone: "info", title: "Verification code sent", description: `Delivered to ${res.masked_email} (demo mode).` });
    } catch (err) {
      setError(apiErrorMessage(err, "Could not send a verification code for this document."));
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await documentsService.confirmEmailVerification(documentId, code);
      push({ tone: "success", title: "Identity verified", description: "Document unlocked for this session." });
      onVerified();
    } catch (err) {
      setError(apiErrorMessage(err, "Invalid or expired verification code."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-md border border-status-warning/30 bg-status-warning/5 p-4">
      <div className="mb-2 flex items-center gap-2 text-status-warning">
        <ShieldAlert className="h-4 w-4" />
        <p className="text-xs font-semibold uppercase tracking-wide">Email Verification Required</p>
      </div>
      <p className="mb-3 text-xs text-text-secondary">
        This document is classified HIGHLY CONFIDENTIAL. Beyond your existing access grant, opening it requires a one-time code sent to your
        registered email{maskedEmail ? ` (${maskedEmail})` : ""}.
      </p>

      {stage === "prompt" && (
        <Button variant="secondary" size="sm" onClick={handleSendCode} disabled={loading}>
          <MailCheck className="h-3.5 w-3.5" /> {loading ? "Sending..." : "Send Verification Code"}
        </Button>
      )}

      {stage === "code-sent" && (
        <form onSubmit={handleConfirm} className="space-y-2.5">
          {demoCode && (
            <p className="rounded border border-accent/30 bg-accent/10 px-2.5 py-1.5 text-[11px] text-accent">
              Demo mode — no real email is sent. Your code is <span className="mono font-semibold">{demoCode}</span> (also in your notification
              bell).
            </p>
          )}
          <Input
            inputMode="numeric"
            maxLength={6}
            required
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="123456"
            className="mono w-40 text-center tracking-[0.4em]"
          />
          <div className="flex gap-2">
            <Button type="submit" variant="primary" size="sm" disabled={loading}>
              {loading ? "Verifying..." : "Verify & Open"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={handleSendCode} disabled={loading}>
              Resend Code
            </Button>
          </div>
        </form>
      )}

      {error && (
        <div className="mt-2 flex items-center gap-2 rounded-md border border-status-critical/30 bg-status-critical/10 px-2.5 py-1.5 text-xs text-status-critical">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
        </div>
      )}
    </div>
  );
}
