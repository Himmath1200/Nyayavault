import { FormEvent, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";
import { casesService } from "@/services/cases";
import { apiErrorMessage } from "@/api/client";
import { CasePriority } from "@/types";
import { useToast } from "@/context/ToastContext";

export function NewCaseDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Digital Fraud Investigation");
  const [jurisdiction, setJurisdiction] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<CasePriority>("MEDIUM");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { push } = useToast();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const created = await casesService.create({ title, category, jurisdiction, description, priority });
      push({ tone: "success", title: "Case created", description: `${created.case_number} — ${created.title}` });
      onCreated(created.id);
      onClose();
      setTitle("");
      setJurisdiction("");
      setDescription("");
    } catch (err) {
      setError(apiErrorMessage(err, "Could not create case."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Create New Case" width="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <Label>Case Title</Label>
          <Input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Operation Northern Ledger" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Category</Label>
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option>Digital Fraud Investigation</option>
              <option>Cybercrime</option>
              <option>Financial Crime</option>
              <option>Missing Person Inquiry</option>
              <option>Assault Investigation</option>
              <option>Property Offense</option>
              <option>Organized Crime</option>
              <option>Identity Theft</option>
            </Select>
          </div>
          <div>
            <Label>Priority</Label>
            <Select value={priority} onChange={(e) => setPriority(e.target.value as CasePriority)}>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </Select>
          </div>
        </div>
        <div>
          <Label>Jurisdiction</Label>
          <Input required value={jurisdiction} onChange={(e) => setJurisdiction(e.target.value)} placeholder="e.g. South District Cyber Cell" />
        </div>
        <div>
          <Label>Description</Label>
          <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief case summary..." />
        </div>
        {error && <p className="text-xs text-status-critical">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? "Creating..." : "Create Case"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
