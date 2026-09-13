"use client";

import { useState } from "react";
import { FAVORITES_MAX } from "@/lib/types";

/** Como mucho FAVORITES_MAX marcados — deshabilita el resto en cuanto se
 * llega al límite, igual que el veto se deshabilita al agotar el budget. */
export function FavoritesField({ otherScouters }: { otherScouters: { id: string; name: string }[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < FAVORITES_MAX) {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium text-foreground">
        Las {FAVORITES_MAX} personas con las que más ilusión te haría compartir unidad
      </legend>
      <p className="text-xs text-muted">
        Elige como mucho {FAVORITES_MAX} ({selected.size}/{FAVORITES_MAX} marcadas).
      </p>
      <div className="grid max-h-40 grid-cols-2 gap-1 overflow-y-auto rounded-md border border-border p-2 sm:grid-cols-3">
        {otherScouters.map((s) => (
          <label key={s.id} className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              name="favoriteWith"
              value={s.id}
              checked={selected.has(s.id)}
              onChange={() => toggle(s.id)}
              disabled={!selected.has(s.id) && selected.size >= FAVORITES_MAX}
            />
            {s.name}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
