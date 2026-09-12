"use client";

export function ExportExcelButton({ href = "/api/export/excel" }: { href?: string }) {
  return (
    <a
      href={href}
      className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-foreground hover:border-accent"
    >
      Exportar a Excel
    </a>
  );
}
