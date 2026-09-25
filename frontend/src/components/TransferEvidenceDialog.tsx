import { FormEvent, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import { evidenceService } from "@/services/evidence";
import { apiErrorMessage } from "@/api/client";
import { CustodyStatus } from "@/types";
import { useToast } from "@/context/ToastContext";

export function TransferEvidenceDialog({ open, onClose, evidenceId, onDone }: { open: boolean; onClose: () => void; evidenceId: string; onDone: () => void }) {
  const [toStatus, setToStatus] = useState<CustodyStatus>("WITH_FORENSICS");
  const [location, setLocation] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { push } = useToast();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await evidenceService.transfer(evidenceId, { to_custody_status: toStatus, location, reason });
      push({ tone: "success", title: "Custody transferred", description: `New status: ${toStatus.replace(/_/g, " ")}` });
      onDone();
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err, "Transfer failed."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Transfer Evidence Custody">
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <Label>New Custody Status</Label>
          <Select value={toStatus} onChange={(e) => setToStatus(e.target.value as CustodyStatus)}>
            <option value="WITH_INVESTIGATOR">With Investigator</option>
            <option value="WITH_FORENSICS">With Forensics</option>
            <option value="IN_TRANSIT">In Transit</option>
            <option value="WITH_COURT">With Court</option>
            <option value="ARCHIVED">Archived</option>
          </Select>
        </div>
        <div>
          <Label>Location</Label>
          <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Forensic Lab, Sector 21" />
        </div>
        <div>
          <Label>Reason</Label>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Handover for forensic analysis" />
        </div>
        {error && <p className="text-xs text-status-critical">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? "Transferring..." : "Confirm Transfer"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
