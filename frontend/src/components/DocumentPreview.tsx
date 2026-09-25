import { useEffect, useState } from "react";
import { FileWarning, Loader2 } from "lucide-react";
import { documentsService, requiresEmailVerification } from "@/services/documents";
import { apiErrorMessage } from "@/api/client";
import { AccessPurpose, DocumentItem } from "@/types";

const TEXT_MIME_TYPES = ["text/plain", "application/json"];

/**
 * Fetches and displays a document's actual content inline once access has been granted —
 * "access granted" leads straight into the document itself, not just a status message with a
 * separate download step. Only plain-text content is rendered inline (all current demo
 * documents are .txt); other MIME types fall back to a clear "use Download" notice rather than
 * attempting an unsafe inline render.
 */
export function DocumentPreview({
  document,
  purpose,
  onEmailVerificationRequired,
}: {
  document: DocumentItem;
  purpose: AccessPurpose;
  onEmailVerificationRequired: () => void;
}) {
  const [state, setState] = useState<"loading" | "ready" | "unsupported" | "error">("loading");
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    documentsService
      .fetchContent(document.id, purpose)
      .then(({ data, mimeType }) => {
        if (cancelled) return;
        if (TEXT_MIME_TYPES.some((t) => mimeType.startsWith(t))) {
          setText(new TextDecoder().decode(data));
          setState("ready");
        } else {
          setState("unsupported");
        }
      })
      .catch((err) => {
        if (cancelled) return;
        if (requiresEmailVerification(err)) {
          onEmailVerificationRequired();
          return;
        }
        setError(apiErrorMessage(err, "Could not open this document."));
        setState("error");
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [document.id, purpose]);

  if (state === "loading") {
    return (
      <div className="flex items-center justify-center gap-2 rounded-md border border-base-border bg-base-bg py-10 text-xs text-text-muted">
        <Loader2 className="h-4 w-4 animate-spin text-accent" /> Opening document...
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="flex items-center gap-2 rounded-md border border-status-critical/30 bg-status-critical/10 px-3 py-3 text-xs text-status-critical">
        <FileWarning className="h-4 w-4 shrink-0" /> {error}
      </div>
    );
  }

  if (state === "unsupported") {
    return (
      <div className="flex items-center gap-2 rounded-md border border-base-border bg-base-bg px-3 py-3 text-xs text-text-secondary">
        <FileWarning className="h-4 w-4 shrink-0 text-text-muted" /> Preview isn't available for this file type ({document.mime_type}) — use
        Download to save and open it locally.
      </div>
    );
  }

  return (
    <div className="max-h-72 overflow-y-auto rounded-md border border-base-border bg-base-bg p-3">
      <pre className="whitespace-pre-wrap break-words font-sans text-xs text-text-secondary">{text}</pre>
    </div>
  );
}
