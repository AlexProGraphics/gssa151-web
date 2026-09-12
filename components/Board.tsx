"use client";

import { useMemo, useState, useTransition } from "react";
import type { BoardCard, BoardUnit } from "@/lib/board";
import { UNASSIGNED_COLUMN_ID } from "@/lib/board";
import { UnitColumn } from "./UnitColumn";
import { ExportExcelButton } from "./ExportExcelButton";
import { ShareWhatsappButton } from "./ShareWhatsappButton";

export function Board({
  units,
  cards,
  editable,
  onMove,
  onUnassign,
  extraActions,
  whatsappTitle,
  excelHref,
}: {
  units: BoardUnit[];
  cards: BoardCard[];
  editable: boolean;
  onMove?: (scouterId: string, unitId: string) => Promise<void>;
  onUnassign?: (scouterId: string) => Promise<void>;
  extraActions?: React.ReactNode;
  whatsappTitle?: string;
  excelHref?: string;
}) {
  const [prevCards, setPrevCards] = useState(cards);
  const [localCards, setLocalCards] = useState(cards);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Re-sync when the server sends fresh data (e.g. after router.refresh()
  // from "Generar sugerencia", which changes assignments this component
  // didn't make optimistically itself).
  if (cards !== prevCards) {
    setPrevCards(cards);
    setLocalCards(cards);
  }

  const cardsByUnit = useMemo(() => {
    const map = new Map<string, BoardCard[]>();
    map.set(UNASSIGNED_COLUMN_ID, []);
    for (const unit of units) map.set(unit.id, []);
    for (const card of localCards) {
      const key = card.unitId ?? UNASSIGNED_COLUMN_ID;
      map.get(key)?.push(card);
    }
    return map;
  }, [localCards, units]);

  function handleSelectCard(scouterId: string) {
    setSelectedId((current) => (current === scouterId ? null : scouterId));
  }

  function handleDrop(scouterId: string, targetId: string) {
    if (!editable) return;
    const isUnassign = targetId === UNASSIGNED_COLUMN_ID;
    if (isUnassign ? !onUnassign : !onMove) return;

    setLocalCards((current) =>
      current.map((card) =>
        card.scouterId === scouterId
          ? { ...card, unitId: isUnassign ? null : targetId }
          : card,
      ),
    );
    setSelectedId(null);
    startTransition(() => {
      const action = isUnassign ? onUnassign!(scouterId) : onMove!(scouterId, targetId);
      action.catch(() => {
        // Revert on failure.
        setLocalCards(cards);
      });
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <ShareWhatsappButton units={units} cardsByUnit={cardsByUnit} title={whatsappTitle} />
        <ExportExcelButton href={excelHref} />
        {extraActions}
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4">
        <UnitColumn
          unit={{
            id: UNASSIGNED_COLUMN_ID,
            name: "Sin asignar",
            color: "var(--muted)",
          }}
          cards={cardsByUnit.get(UNASSIGNED_COLUMN_ID) ?? []}
          editable={editable}
          selectedId={selectedId}
          onSelectCard={handleSelectCard}
          onDropCard={handleDrop}
        />
        {units.map((unit) => (
          <UnitColumn
            key={unit.id}
            unit={unit}
            cards={cardsByUnit.get(unit.id) ?? []}
            editable={editable}
            selectedId={selectedId}
            onSelectCard={handleSelectCard}
            onDropCard={handleDrop}
          />
        ))}
      </div>
    </div>
  );
}
