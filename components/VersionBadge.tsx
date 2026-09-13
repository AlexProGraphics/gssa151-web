import { APP_VERSION } from "@/lib/version";

export function VersionBadge() {
  return (
    <span className="fixed right-2 top-2 z-50 rounded-full border border-border bg-surface/90 px-2 py-0.5 text-[10px] font-medium text-muted shadow-sm backdrop-blur">
      {APP_VERSION}
    </span>
  );
}
