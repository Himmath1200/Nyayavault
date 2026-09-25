import { FormEvent, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Label, Select, Textarea } from "@/components/ui/Input";
import { accessService } from "@/services/access";
import { apiErrorMessage } from "@/api/client";
import { AccessAction, AccessPurpose } from "@/types";
import { defaultPurposeForRole } from "@/utils/rbac";
import { useAuth } from "@/context/AuthContext";

export function AccessRequestDialog({ open, onClose, documentId }: { open: boolean; onClose: () => void; documentId: string }) {
  const { user } = useAuth();
  const [purpose, setPurpose] = useState<AccessPurpose>(defaultPurposeForRole(user?.role));
  const [action, setAction] = useState<AccessAction>("VIEW");
  const [justification, setJustification] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await accessService.create({ document_id: documentId, purpose, action, justification });
      setSubmitted(true);
    } catch (err) {
      setError(apiErrorMessage(err, "Could not submit access request."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={() => {
        setSubmitted(false);
        onClose();
      }}
      title="Request Access"
    >
      {submitted ? (
        <div className="space-y-3 text-center">
          <p className="text-sm text-text-secondary">Your access request has been submitted for approval. You'll be notified once it is reviewed.</p>
          <Button
            variant="primary"
            className="w-full"
            onClick={() => {
              setSubmitted(false);
              onClose();
            }}
          >
            Close
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <Label>Purpose</Label>
            <Select value={purpose} onChange={(e) => setPurpose(e.target.value as AccessPurpose)}>
              <option value="INVESTIGATION">Investigation</option>
              <option value="COURT_PREPARATION">Court Preparation</option>
              <option value="FORENSIC_ANALYSIS">Forensic Analysis</option>
              <option value="ADMINISTRATIVE_REVIEW">Administrative Review</option>
              <option value="EVIDENCE_VERIFICATION">Evidence Verification</option>
            </Select>
          </div>
          <div>
            <Label>Requested Action</Label>
            <Select value={action} onChange={(e) => setAction(e.target.value as AccessAction)}>
              <option value="VIEW">View</option>
              <option value="DOWNLOAD">Download</option>
              <option value="SHARE">Share</option>
            </Select>
          </div>
          <div>
            <Label>Justification</Label>
            <Textarea rows={3} value={justification} onChange={(e) => setJustification(e.target.value)} placeholder="Briefly explain why access is required..." />
          </div>
          {error && <p className="text-xs text-status-critical">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? "Submitting..." : "Submit Request"}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
