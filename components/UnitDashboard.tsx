import type { BoardCard, BoardUnit } from "@/lib/board";
import { UNASSIGNED_COLUMN_ID } from "@/lib/board";

/** Read-only overview: every unit visible at once with its scouters listed
 * below — no drag/drop, no selection state (that's Board.tsx, for the
 * admin editor). */
export function UnitDashboard({
  units,
  cardsByUnit,
}: {
  units: BoardUnit[];
  cardsByUnit: Map<string, BoardCard[]>;
}) {
  const unassigned = cardsByUnit.get(UNASSIGNED_COLUMN_ID) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {units.map((unit) => {
          const cards = cardsByUnit.get(unit.id) ?? [];
          return (
            <div
              key={unit.id}
              className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 border-t-4"
              style={{ borderTopColor: unit.color }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: unit.color }}
                />
                <h3 className="text-sm font-semibold text-foreground">
                  {unit.name}
                </h3>
                <span className="ml-auto shrink-0 text-xs text-muted">
                  {cards.length}
                </span>
              </div>
              {cards.length > 0 ? (
                <ul className="flex flex-col gap-1.5">
                  {cards.map((card) => (
                    <li
                      key={card.scouterId}
                      className="rounded-md bg-background/60 px-2.5 py-1.5 text-sm text-foreground"
                    >
                      {card.name}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">
                  Sin scouters asignados todavía.
                </p>
              )}
            </div>
          );
        })}
      </div>

      {unassigned.length > 0 && (
        <div className="rounded-xl border border-dashed border-border p-4">
          <h3 className="mb-2 text-sm font-semibold text-muted">Sin asignar</h3>
          <div className="flex flex-wrap gap-2">
            {unassigned.map((card) => (
              <span
                key={card.scouterId}
                className="rounded-md border border-border px-2.5 py-1 text-sm text-foreground"
              >
                {card.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
