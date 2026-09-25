import { Link } from "react-router-dom";
import { ShieldOff } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <ShieldOff className="h-8 w-8 text-text-muted" />
      <p className="text-sm text-text-secondary">Page not found.</p>
      <Link to="/" className="text-xs text-accent hover:underline">
        Return to Command Center
      </Link>
    </div>
  );
}
