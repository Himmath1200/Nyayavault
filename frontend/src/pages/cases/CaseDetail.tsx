import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, MapPin, ShieldAlert, Upload, Users } from "lucide-react";
import { casesService } from "@/services/cases";
import { documentsService } from "@/services/documents";
import { evidenceService } from "@/services/evidence";
import { auditService } from "@/services/audit";
import { aiService } from "@/services/ai";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DocumentTable } from "@/components/DocumentTable";
import { CaseGraph } from "@/components/CaseGraph";
import { CustodyTimeline } from "@/components/CustodyTimeline";
import { UploadDialog } from "@/components/UploadDialog";
import { DocumentDetailDialog } from "@/components/DocumentDetailDialog";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/States";
import { formatDate, roleLabel, truncateHash } from "@/utils/format";
import { DocumentItem } from "@/types";
import { can, PERMISSIONS } from "@/utils/rbac";
import { useAuth } from "@/context/AuthContext";

type TabLabel =
  | "Overview"
  | "Documents"
  | "Evidence"
  | "AI Intelligence"
  | "Timeline"
  | "People"
  | "Locations"
  | "Chain of Custody"
  | "Audit"
  | "Security";

interface TabDef {
  label: TabLabel;
  permission?: (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
}

const TABS: TabDef[] = [
  { label: "Overview" },
  { label: "Documents", permission: PERMISSIONS.DOCUMENT_VIEW },
  { label: "Evidence", permission: PERMISSIONS.EVIDENCE_VIEW },
  { label: "AI Intelligence", permission: PERMISSIONS.AI_USE },
  { label: "Timeline", permission: PERMISSIONS.AI_USE },
  { label: "People", permission: PERMISSIONS.AI_USE },
  { label: "Locations", permission: PERMISSIONS.AI_USE },
  { label: "Chain of Custody", permission: PERMISSIONS.CUSTODY_VIEW },
  { label: "Audit", permission: PERMISSIONS.AUDIT_VIEW },
  { label: "Security", permission: PERMISSIONS.AUDIT_VIEW },
];
type Tab = TabLabel;

export default function CaseDetail() {
  const { caseId } = useParams<{ caseId: string }>();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("Overview");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string | null>(null);

  const { data: caseData, isLoading: caseLoading } = useQuery({ queryKey: ["case", caseId], queryFn: () => casesService.get(caseId!), enabled: !!caseId });
  const { data: documents } = useQuery({ queryKey: ["documents", caseId], queryFn: () => documentsService.list(caseId), enabled: !!caseId });
  const { data: evidenceList } = useQuery({ queryKey: ["evidence-list", caseId], queryFn: () => evidenceService.list(caseId), enabled: !!caseId });
  const { data: auditEvents } = useQuery({ queryKey: ["audit-events", caseId], queryFn: () => auditService.list({ case_id: caseId, limit: 100 }), enabled: !!caseId && (tab === "Audit" || tab === "Security") });
  const { data: insights } = useQuery({ queryKey: ["case-insights", caseId], queryFn: () => aiService.caseInsights(caseId!), enabled: !!caseId && (tab === "AI Intelligence" || tab === "People" || tab === "Locations") });
  const { data: contradictions } = useQuery({ queryKey: ["contradictions", caseId], queryFn: () => aiService.contradictions(caseId!), enabled: !!caseId && tab === "AI Intelligence" });
  const { data: timelineEvents } = useQuery({ queryKey: ["timeline", caseId], queryFn: () => aiService.timeline(caseId!), enabled: !!caseId && tab === "Timeline" });
  const { data: custodyEvents } = useQuery({
    queryKey: ["custody", selectedEvidenceId],
    queryFn: () => evidenceService.custody(selectedEvidenceId!),
    enabled: !!selectedEvidenceId,
  });

  if (caseLoading) return <LoadingState label="Loading case..." />;
  if (!caseData) return <ErrorState message="Case not found or you do not have access." />;

  const activeEvidence = evidenceList?.find((e) => e.id === selectedEvidenceId) ?? evidenceList?.[0] ?? null;
  const securityEvents = (auditEvents ?? []).filter((e) => ["ACCESS_DENIED", "ACCESS_GRANTED", "SECURITY_ALERT", "INTEGRITY_FAILED"].includes(e.action));

  return (
    <div>
      <PageHeader
        title={caseData.title}
        subtitle={`${caseData.case_number} · ${caseData.category} · ${caseData.jurisdiction}`}
        actions={
          can(user?.role, PERMISSIONS.DOCUMENT_UPLOAD) && (
            <Button variant="primary" size="sm" onClick={() => setUploadOpen(true)}>
              <Upload className="h-4 w-4" /> Upload Document
            </Button>
          )
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <StatusBadge value={caseData.status} />
        <StatusBadge value={caseData.priority} />
        {caseData.security_flagged && (
          <Badge tone="critical">
            <ShieldAlert className="h-3 w-3" /> Security Flagged
          </Badge>
        )}
        <span className="text-xs text-text-muted">Created {formatDate(caseData.created_at, "dd MMM yyyy")}</span>
      </div>

      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-base-border">
        {TABS.filter((t) => !t.permission || can(user?.role, t.permission)).map((t) => (
          <button
            key={t.label}
            onClick={() => setTab(t.label)}
            className={`relative shrink-0 px-3 py-2 text-xs font-medium transition-colors ${
              tab === t.label ? "text-accent" : "text-text-secondary hover:text-text-primary"
            }`}
          >
            {t.label}
            {tab === t.label && (
              <motion.div layoutId="case-tab-underline" className="absolute inset-x-0 -bottom-px h-0.5 bg-accent" transition={{ type: "spring", stiffness: 500, damping: 38 }} />
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
      <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
      {tab === "Overview" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="panel p-4 lg:col-span-2">
            <p className="label-caps mb-2">Case Description</p>
            <p className="text-sm text-text-secondary">{caseData.description || "No description provided."}</p>
          </div>
          <div className="panel p-4 space-y-2 text-xs">
            <p className="label-caps mb-1">Case Metrics</p>
            <div className="flex justify-between"><span className="text-text-muted">Documents</span><span className="text-text-primary font-medium">{documents?.length ?? 0}</span></div>
            <div className="flex justify-between"><span className="text-text-muted">Evidence Items</span><span className="text-text-primary font-medium">{evidenceList?.length ?? 0}</span></div>
            <div className="flex justify-between"><span className="text-text-muted">Last Updated</span><span className="text-text-primary">{formatDate(caseData.updated_at)}</span></div>
          </div>
        </div>
      )}

      {tab === "Documents" && (
        <div className="panel overflow-hidden">
          <DocumentTable documents={documents ?? []} onSelect={setSelectedDoc} />
        </div>
      )}

      {tab === "Evidence" && (
        <div className="panel overflow-hidden">
          {!evidenceList || evidenceList.length === 0 ? (
            <EmptyState title="No evidence recorded" />
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-base-border text-[11px] uppercase tracking-wide text-text-muted">
                  <th className="px-4 py-2.5 font-medium">Evidence ID</th>
                  <th className="px-4 py-2.5 font-medium">Hash</th>
                  <th className="px-4 py-2.5 font-medium">Integrity</th>
                  <th className="px-4 py-2.5 font-medium">Custody</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-base-border">
                {evidenceList.map((e) => (
                  <tr
                    key={e.id}
                    className={can(user?.role, PERMISSIONS.CUSTODY_VIEW) ? "hover:bg-base-hover cursor-pointer" : ""}
                    onClick={() => {
                      if (!can(user?.role, PERMISSIONS.CUSTODY_VIEW)) return;
                      setSelectedEvidenceId(e.id);
                      setTab("Chain of Custody");
                    }}
                  >
                    <td className="px-4 py-3 mono text-xs text-accent">{e.evidence_number}</td>
                    <td className="px-4 py-3 mono text-[11px] text-text-muted">{truncateHash(e.sha256_hash, 14)}</td>
                    <td className="px-4 py-3"><StatusBadge value={e.integrity_status} /></td>
                    <td className="px-4 py-3"><StatusBadge value={e.custody_status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "AI Intelligence" && (
        <div className="space-y-4">
          {!insights?.available ? (
            <div className="panel p-6 text-center text-sm text-text-secondary">{insights?.message ?? "AI analysis temporarily unavailable."}</div>
          ) : (
            <>
              <div className="panel overflow-hidden">
                <CaseGraph
                  case={caseData}
                  people={insights.key_people ?? []}
                  locations={insights.key_locations ?? []}
                  evidenceNumbers={(evidenceList ?? []).map((e) => e.evidence_number)}
                  documentNames={(documents ?? []).map((d) => d.name)}
                />
              </div>
              <div className="panel p-4">
                <p className="label-caps mb-2">AI Case Summary</p>
                <p className="text-sm text-text-secondary">{insights.summary}</p>
                <p className="mt-3 text-[11px] italic text-text-muted border-t border-base-border pt-2">{insights.disclaimer}</p>
              </div>
              {contradictions && contradictions.length > 0 && (
                <div className="panel p-4">
                  <p className="label-caps mb-2 flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5 text-status-warning" /> Potential Inconsistencies</p>
                  <div className="space-y-2">
                    {contradictions.map((c) => (
                      <div key={c.id} className="rounded-md border border-status-warning/25 bg-status-warning/5 px-3 py-2 text-xs text-text-secondary">
                        {c.description}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {tab === "Timeline" && (
        <div className="panel divide-y divide-base-border">
          {!timelineEvents || timelineEvents.length === 0 ? (
            <EmptyState title="No timeline events found" />
          ) : (
            timelineEvents.map((e) => (
              <div key={e.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="text-text-primary">{e.event}</span>
                <span className="text-[11px] text-text-muted">{formatDate(e.date)}</span>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "People" && (
        <div className="panel p-4">
          <p className="label-caps mb-2 flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Key People</p>
          <div className="flex flex-wrap gap-1.5">
            {(insights?.key_people ?? []).length === 0 ? <p className="text-xs text-text-muted">No named individuals identified yet.</p> : insights!.key_people!.map((p) => <Badge key={p} tone="accent">{p}</Badge>)}
          </div>
        </div>
      )}

      {tab === "Locations" && (
        <div className="panel p-4">
          <p className="label-caps mb-2 flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> Locations</p>
          <div className="flex flex-wrap gap-1.5">
            {(insights?.key_locations ?? []).length === 0 ? <p className="text-xs text-text-muted">No locations identified yet.</p> : insights!.key_locations!.map((l) => <Badge key={l} tone="success">{l}</Badge>)}
          </div>
        </div>
      )}

      {tab === "Chain of Custody" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="panel p-4">
            <p className="label-caps mb-2">Evidence Item</p>
            <select
              value={activeEvidence?.id ?? ""}
              onChange={(e) => setSelectedEvidenceId(e.target.value)}
              className="w-full rounded-md border border-base-border bg-base-bg px-2.5 py-2 text-xs text-text-primary"
            >
              {evidenceList?.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.evidence_number}
                </option>
              ))}
            </select>
          </div>
          <div className="lg:col-span-2">
            <CustodyTimeline events={custodyEvents ?? []} />
          </div>
        </div>
      )}

      {tab === "Audit" && (
        <div className="panel divide-y divide-base-border">
          {!auditEvents || auditEvents.length === 0 ? (
            <EmptyState title="No audit events for this case" />
          ) : (
            auditEvents.map((e) => (
              <div key={e.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <div>
                  <p className="text-text-primary text-xs font-medium">{e.action.replace(/_/g, " ")}</p>
                  <p className="text-[11px] text-text-muted">{roleLabel(e.actor_role)}</p>
                </div>
                <span className="text-[11px] text-text-muted">{formatDate(e.timestamp)}</span>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "Security" && (
        <div className="panel divide-y divide-base-border">
          {securityEvents.length === 0 ? (
            <EmptyState title="No security-relevant events for this case" icon={<ShieldAlert className="h-5 w-5" />} />
          ) : (
            securityEvents.map((e) => (
              <div key={e.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <StatusBadge value={e.action.includes("DENIED") || e.action.includes("FAILED") ? "FAILED" : "VERIFIED"} />
                <span className="text-text-primary text-xs">{e.action.replace(/_/g, " ")}</span>
                <span className="text-[11px] text-text-muted">{formatDate(e.timestamp)}</span>
              </div>
            ))
          )}
        </div>
      )}
      </motion.div>
      </AnimatePresence>

      <UploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} cases={[caseData]} defaultCaseId={caseData.id} />
      <DocumentDetailDialog document={selectedDoc} onClose={() => setSelectedDoc(null)} />
    </div>
  );
}
