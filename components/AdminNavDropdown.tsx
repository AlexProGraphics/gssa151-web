"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const ITEMS = [
  { href: "/admin/board", label: "Tablero" },
  { href: "/admin/scouters", label: "Scouters" },
  { href: "/admin/respuestas", label: "Respuestas" },
  { href: "/admin/units", label: "Unidades" },
];

export function AdminNavDropdown() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("click", onClickOutside);
    return () => document.removeEventListener("click", onClickOutside);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-muted hover:text-foreground"
      >
        Panel admin
        <span aria-hidden className="text-xs">
          {open ? "▲" : "▼"}
        </span>
      </button>
      {open && (
        <div className="absolute left-0 top-full z-10 mt-2 flex w-40 flex-col overflow-hidden rounded-md border border-border bg-surface py-1 shadow-lg">
          {ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="px-3 py-1.5 text-sm text-foreground hover:bg-background"
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
