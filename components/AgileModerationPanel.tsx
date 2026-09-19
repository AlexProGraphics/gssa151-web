"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  addAgileModerationParticipant,
  grantExtraAgileIntervention,
  pauseAgendaItem,
  removeAgileModerationParticipant,
  startAgendaItem,
  startAgileIntervention,
  stopAgileIntervention,
  updateAgendaItemMinutes,
} from "@/app/actions";
import type {
  AgendaEntitlement,
  AgendaItem,
  ModerationParticipant,
  OpenIntervention,
} from "@/lib/agileModeration";

const DURATIONS = [60, 30, 15] as const;

interface RunningTurn {
  interventionId: string;
  scouterId: string;
  durationSeconds: number;
  startedAtMs: number;
  agendaItemId: string | null;
}

type EntitlementsState = Record<string, Record<string, AgendaEntitlement>>;

function formatMinutesSeconds(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Para totales de reunión, que pueden pasar de la hora (el PAG solo ya son
 * 90 min planificados) — h:mm:ss, o mm:ss si no llega a la hora. */
function formatLong(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Reconstruye cada punto del orden del día para que, si llega ya en
 * marcha (resumido tras recargar la página), su elapsedSeconds represente
 * la "base congelada" antes de esta tanda — el resto de esta tanda se suma
 * en vivo a partir de startedAt (ver liveAgendaSeconds). Aplicar esto tanto
 * al montar como cada vez que llegan props frescas (tras editar minutos, p.
 * ej.) evita que el contador salte al recibir una nueva foto del servidor. */
function normalizeAgendaItems(items: AgendaItem[]): AgendaItem[] {
  return items.map((item) => {
    if (!item.running || !item.startedAt) return item;
    const delta = Math.round((Date.now() - new Date(item.startedAt).getTime()) / 1000);
    return { ...item, elapsedSeconds: Math.max(0, item.elapsedSeconds - Math.max(0, delta)) };
  });
}

/** Timbre tipo temporizador de iPhone: un acorde de campana brillante
 * (varias notas con ataque rápido y caída exponencial) que se repite sin
 * parar hasta que se llama a la función que esta misma devuelve — no hay
 * ningún límite de repeticiones automático, a diferencia de un pitido
 * suelto. Hecho con Web Audio API, sin ningún fichero de audio. */
function startAlarmLoop(): () => void {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioContextClass();
    const notes = [1567.98, 1975.53, 2637.02]; // G6, B6, E7 — brillante, tipo campanilla
    const playChord = () => {
      const now = ctx.currentTime;
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        const start = now + i * 0.05;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.32, start + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.55);
      });
    };
    playChord();
    const intervalId = window.setInterval(playChord, 750);
    return () => {
      window.clearInterval(intervalId);
      ctx.close().catch(() => {});
    };
  } catch {
    // Si el navegador bloquea el audio, no hay nada más que hacer — el
    // temporizador en pantalla ya avisa igual.
    return () => {};
  }
}

export function AgileModerationPanel({
  councilId,
  slug,
  participants: initialParticipants,
  openIntervention,
  addableScouters,
  agendaItems: initialAgendaItems,
  entitlementsByAgendaItem: initialEntitlements,
}: {
  councilId: string;
  slug: string;
  participants: ModerationParticipant[];
  openIntervention: OpenIntervention | null;
  addableScouters: { id: string; name: string }[];
  agendaItems: AgendaItem[];
  entitlementsByAgendaItem: EntitlementsState;
}) {
  // Los tres bloques de abajo "adaptan" el estado local cuando llegan props
  // frescas del servidor (tras un revalidatePath) sin usar un efecto — según
  // la propia recomendación de React, ajustar el estado durante el render
  // (comparando contra la última prop vista) evita un frame extra visible y
  // el aviso de lint react-hooks/set-state-in-effect.
  const [participants, setParticipants] = useState(initialParticipants);
  const [prevInitialParticipants, setPrevInitialParticipants] = useState(initialParticipants);
  if (initialParticipants !== prevInitialParticipants) {
    setPrevInitialParticipants(initialParticipants);
    setParticipants(initialParticipants);
  }

  const [agendaItems, setAgendaItems] = useState(() => normalizeAgendaItems(initialAgendaItems));
  const [prevInitialAgendaItems, setPrevInitialAgendaItems] = useState(initialAgendaItems);
  if (initialAgendaItems !== prevInitialAgendaItems) {
    setPrevInitialAgendaItems(initialAgendaItems);
    setAgendaItems(normalizeAgendaItems(initialAgendaItems));
  }

  const [entitlements, setEntitlements] = useState<EntitlementsState>(initialEntitlements);
  const [prevInitialEntitlements, setPrevInitialEntitlements] = useState(initialEntitlements);
  if (initialEntitlements !== prevInitialEntitlements) {
    setPrevInitialEntitlements(initialEntitlements);
    setEntitlements(initialEntitlements);
  }

  const [selectedSpeakerId, setSelectedSpeakerId] = useState<string | null>(
    openIntervention?.scouterId ?? null,
  );
  const [running, setRunning] = useState<RunningTurn | null>(
    openIntervention
      ? {
          interventionId: openIntervention.id,
          scouterId: openIntervention.scouterId,
          durationSeconds: openIntervention.durationSeconds,
          startedAtMs: new Date(openIntervention.startedAt).getTime(),
          agendaItemId: openIntervention.agendaItemId,
        }
      : null,
  );
  const [remainingMs, setRemainingMs] = useState<number>(
    running ? running.durationSeconds * 1000 - (Date.now() - running.startedAtMs) : 0,
  );
  const [showAddForm, setShowAddForm] = useState(false);
  const [alarmRinging, setAlarmRinging] = useState(false);
  const finishingRef = useRef(false);
  const stopAlarmRef = useRef<() => void>(() => {});
  const [now, setNow] = useState(() => Date.now());

  const activeAgendaItem = agendaItems.find((i) => i.running) ?? null;

  useEffect(() => {
    const anyAgendaRunning = agendaItems.some((i) => i.running);
    if (!running && !anyAgendaRunning) return;
    const interval = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(interval);
  }, [running, agendaItems]);

  useEffect(() => {
    if (!running) return;
    finishingRef.current = false;

    const tick = () => {
      const remaining = running.durationSeconds * 1000 - (Date.now() - running.startedAtMs);
      setRemainingMs(remaining);
      if (remaining <= 0) finish(true);
    };
    tick();
    const interval = setInterval(tick, 200);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  // Para el aviso sonoro si el admin cierra/navega fuera de la pestaña
  // mientras sigue sonando — no hay forma de "detener" desde fuera si no.
  useEffect(() => () => stopAlarmRef.current(), []);

  function stopAlarm() {
    stopAlarmRef.current();
    stopAlarmRef.current = () => {};
    setAlarmRinging(false);
  }

  function liveAgendaSeconds(item: AgendaItem): number {
    if (!item.running || !item.startedAt) return item.elapsedSeconds;
    return item.elapsedSeconds + Math.max(0, Math.floor((now - new Date(item.startedAt).getTime()) / 1000));
  }

  async function finish(hitZero: boolean) {
    if (!running || finishingRef.current) return;
    finishingRef.current = true;

    const elapsedSeconds = hitZero
      ? running.durationSeconds
      : Math.max(0, Math.min(running.durationSeconds, Math.round((Date.now() - running.startedAtMs) / 1000)));
    const { interventionId, scouterId, agendaItemId } = running;

    setRunning(null);
    setRemainingMs(0);
    setParticipants((prev) =>
      prev.map((p) =>
        p.scouterId === scouterId
          ? {
              ...p,
              totalSpokenSeconds: p.totalSpokenSeconds + elapsedSeconds,
              interventionsCount: p.interventionsCount + 1,
            }
          : p,
      ),
    );
    if (agendaItemId) {
      setEntitlements((prev) => {
        const itemMap = prev[agendaItemId] ?? {};
        const current = itemMap[scouterId] ?? { scouterId, granted: 0, used: 0, remaining: 0 };
        const used = current.used + 1;
        return {
          ...prev,
          [agendaItemId]: {
            ...itemMap,
            [scouterId]: { ...current, used, remaining: Math.max(0, current.granted - used) },
          },
        };
      });
    }
    if (hitZero) {
      stopAlarmRef.current = startAlarmLoop();
      setAlarmRinging(true);
    }

    await stopAgileIntervention(interventionId, elapsedSeconds);
  }

  async function handleStart(durationSeconds: number) {
    if (!selectedSpeakerId || running) return;
    stopAlarm();
    const agendaItemId = activeAgendaItem?.id ?? null;
    const { id, startedAt } = await startAgileIntervention(
      councilId,
      selectedSpeakerId,
      durationSeconds,
      agendaItemId,
    );
    setRunning({
      interventionId: id,
      scouterId: selectedSpeakerId,
      durationSeconds,
      startedAtMs: new Date(startedAt).getTime(),
      agendaItemId,
    });
    setRemainingMs(durationSeconds * 1000);
  }

  async function handleToggleAgendaItem(item: AgendaItem) {
    if (item.running) {
      const delta = Math.max(0, Math.round((Date.now() - new Date(item.startedAt!).getTime()) / 1000));
      setAgendaItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, running: false, startedAt: null, elapsedSeconds: i.elapsedSeconds + delta } : i)),
      );
      await pauseAgendaItem(item.id, delta);
    } else {
      const { startedAt } = await startAgendaItem(councilId, item.id);
      setAgendaItems((prev) =>
        prev.map((i) => {
          if (i.id === item.id) return { ...i, running: true, startedAt };
          if (i.running) {
            const delta = Math.max(0, Math.round((Date.now() - new Date(i.startedAt!).getTime()) / 1000));
            return { ...i, running: false, startedAt: null, elapsedSeconds: i.elapsedSeconds + delta };
          }
          return i;
        }),
      );
    }
  }

  const selectedSpeaker = participants.find((p) => p.scouterId === selectedSpeakerId) ?? null;
  const fixedTurnSeconds = activeAgendaItem?.turnSeconds ?? null;
  const availableDurations = selectedSpeaker?.penalized
    ? [15]
    : fixedTurnSeconds !== null
      ? [fixedTurnSeconds]
      : DURATIONS;
  const seconds = Math.max(0, Math.ceil(remainingMs / 1000));

  const activeEntitlements = activeAgendaItem?.surveyField ? entitlements[activeAgendaItem.id] : undefined;

  const totals = useMemo(() => {
    const totalSpoken = participants.reduce((acc, p) => acc + p.totalSpokenSeconds, 0);
    const totalInterventions = participants.reduce((acc, p) => acc + p.interventionsCount, 0);
    const totalPlannedMinutes = agendaItems.reduce((acc, i) => acc + i.plannedMinutes, 0);
    const totalElapsedSeconds = agendaItems.reduce((acc, i) => acc + liveAgendaSeconds(i), 0);
    const topSpeaker = participants.reduce<ModerationParticipant | null>(
      (top, p) => (p.totalSpokenSeconds > 0 && (!top || p.totalSpokenSeconds > top.totalSpokenSeconds) ? p : top),
      null,
    );
    return { totalSpoken, totalInterventions, totalPlannedMinutes, totalElapsedSeconds, topSpeaker };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participants, agendaItems, now]);

  // Agrupa visualmente los puntos que comparten group_label (los 4 ámbitos
  // del PAG) sin perder que cada uno sigue siendo un punto independiente.
  const agendaGroups = useMemo(() => {
    const groups: { label: string | null; items: AgendaItem[] }[] = [];
    for (const item of agendaItems) {
      const last = groups[groups.length - 1];
      if (last && last.label === item.groupLabel) {
        last.items.push(item);
      } else {
        groups.push({ label: item.groupLabel, items: [item] });
      }
    }
    return groups;
  }, [agendaItems]);

  return (
    <div className="flex flex-col gap-6">
      {/* Resumen / analíticas del consejo */}
      <div className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-surface/50 p-4 sm:grid-cols-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] uppercase tracking-wide text-muted">Reunión</span>
          <span className="text-lg font-semibold tabular-nums text-foreground">
            {formatLong(totals.totalElapsedSeconds)}
          </span>
          <span className="text-[11px] text-muted">de {Math.round(totals.totalPlannedMinutes)} min planificados</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] uppercase tracking-wide text-muted">Tiempo hablado</span>
          <span className="text-lg font-semibold tabular-nums text-foreground">
            {formatLong(totals.totalSpoken)}
          </span>
          <span className="text-[11px] text-muted">entre {participants.length} participantes</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] uppercase tracking-wide text-muted">Intervenciones</span>
          <span className="text-lg font-semibold tabular-nums text-foreground">{totals.totalInterventions}</span>
          <span className="text-[11px] text-muted">completadas en total</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] uppercase tracking-wide text-muted">Más tiempo hablado</span>
          <span className="truncate text-lg font-semibold text-foreground">
            {totals.topSpeaker ? totals.topSpeaker.name : "—"}
          </span>
          <span className="text-[11px] text-muted">
            {totals.topSpeaker ? formatMinutesSeconds(totals.topSpeaker.totalSpokenSeconds) : "todavía nadie"}
          </span>
        </div>
      </div>

      {/* Orden del día */}
      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-foreground">🗒️ Orden del día</h2>
        <div className="flex flex-col gap-2">
          {agendaGroups.map((group, gi) => (
            <div key={gi} className="flex flex-col gap-1.5">
              {group.label && (
                <p className="pl-1 text-xs font-medium uppercase tracking-wide text-accent">{group.label}</p>
              )}
              <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
                {group.items.map((item) => {
                  const elapsed = liveAgendaSeconds(item);
                  const plannedSeconds = item.plannedMinutes * 60;
                  const pct = plannedSeconds > 0 ? Math.min(1, elapsed / plannedSeconds) : 0;
                  const over = elapsed > plannedSeconds;
                  return (
                    <div
                      key={item.id}
                      className={`flex flex-col gap-2 p-3 transition ${item.running ? "bg-accent/10" : ""}`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-medium text-foreground">{item.title}</span>
                          {item.description && <span className="text-xs text-muted">{item.description}</span>}
                        </div>
                        <div className="flex items-center gap-3">
                          <span
                            className={`text-sm font-medium tabular-nums ${over ? "text-branch-clan" : "text-foreground"}`}
                          >
                            {formatLong(elapsed)}
                          </span>
                          <span className="text-xs text-muted">/</span>
                          <form
                            action={updateAgendaItemMinutes}
                            className="flex items-center gap-1"
                            onSubmit={(e) => e.stopPropagation()}
                          >
                            <input type="hidden" name="agendaItemId" value={item.id} />
                            <input type="hidden" name="slug" value={slug} />
                            <input
                              type="number"
                              name="plannedMinutes"
                              defaultValue={item.plannedMinutes}
                              min={1}
                              step={0.5}
                              className="w-14 rounded-md border border-border bg-surface px-1.5 py-0.5 text-xs text-foreground"
                            />
                            <span className="text-xs text-muted">min</span>
                            <button
                              type="submit"
                              className="rounded-md border border-border px-1.5 py-0.5 text-[11px] text-muted hover:border-accent hover:text-accent"
                            >
                              Guardar
                            </button>
                          </form>
                          <button
                            type="button"
                            onClick={() => handleToggleAgendaItem(item)}
                            className={`rounded-md border px-2.5 py-1 text-xs font-medium transition ${
                              item.running
                                ? "border-branch-clan text-branch-clan hover:bg-branch-clan/10"
                                : "border-accent text-accent hover:bg-accent/10"
                            }`}
                          >
                            {item.running ? "⏸ Pausar" : "▶ Empezar"}
                          </button>
                        </div>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
                        <div
                          className={`h-full rounded-full transition-all ${over ? "bg-branch-clan" : "bg-accent"}`}
                          style={{ width: `${Math.max(4, pct * 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Participantes + temporizador */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-foreground">
              🎤 Participantes ({participants.length})
              {activeAgendaItem && (
                <span className="ml-2 font-normal text-muted">— punto actual: {activeAgendaItem.title}</span>
              )}
            </h2>
            <button
              type="button"
              onClick={() => setShowAddForm((v) => !v)}
              className="text-xs font-medium text-accent hover:underline"
            >
              + Añadir persona
            </button>
          </div>

          {showAddForm && (
            <form
              action={async (formData) => {
                await addAgileModerationParticipant(formData);
                setShowAddForm(false);
              }}
              className="flex flex-col gap-2 rounded-md border border-border p-3"
            >
              <input type="hidden" name="councilId" value={councilId} />
              <input type="hidden" name="slug" value={slug} />
              <select
                name="scouterId"
                required
                defaultValue=""
                className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-foreground"
              >
                <option value="" disabled>
                  Elige a quién añadir…
                </option>
                {addableScouters.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <div className="flex flex-wrap gap-4 text-sm text-foreground">
                <label className="flex items-center gap-1.5">
                  <input type="radio" name="penalized" value="0" defaultChecked />
                  Mismas condiciones que el resto
                </label>
                <label className="flex items-center gap-1.5">
                  <input type="radio" name="penalized" value="1" />
                  Penalizado (no respondió la encuesta — solo 15s)
                </label>
              </div>
              <button
                type="submit"
                className="w-fit rounded-md border border-accent px-3 py-1.5 text-sm font-medium text-accent hover:bg-accent/10"
              >
                Añadir
              </button>
            </form>
          )}

          <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
            {participants.length === 0 && (
              <p className="p-4 text-sm text-muted">
                Todavía no hay nadie — o no ha respondido nadie a la encuesta de
                este consejo, o añade a alguien a mano arriba.
              </p>
            )}
            {participants.map((p) => {
              const entitlement = activeEntitlements?.[p.scouterId];
              return (
                <div
                  key={p.scouterId}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedSpeakerId(p.scouterId)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") setSelectedSpeakerId(p.scouterId);
                  }}
                  className={`flex cursor-pointer items-center justify-between gap-3 p-3 text-left transition ${
                    p.penalized
                      ? selectedSpeakerId === p.scouterId
                        ? "bg-branch-clan/20"
                        : "bg-branch-clan/10 hover:bg-branch-clan/15"
                      : selectedSpeakerId === p.scouterId
                        ? "bg-accent/10"
                        : "hover:bg-surface"
                  }`}
                >
                  <div className="flex flex-col gap-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-sm font-medium ${p.penalized ? "text-branch-clan" : "text-foreground"}`}>
                        {p.name}
                      </span>
                      {running?.scouterId === p.scouterId && (
                        <span
                          className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-branch-clan"
                          title="Hablando ahora"
                        />
                      )}
                      {p.penalized && (
                        <span className="rounded-full bg-branch-clan px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                          Penalizado
                        </span>
                      )}
                      {!p.respondedSurvey && (
                        <span className="rounded-full border border-border px-1.5 py-0.5 text-[10px] font-normal uppercase tracking-wide text-muted">
                          Sin encuesta
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted">
                      {formatMinutesSeconds(p.totalSpokenSeconds)} hablados · {p.interventionsCount}{" "}
                      {p.interventionsCount === 1 ? "intervención" : "intervenciones"}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {entitlement && (
                      <>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            entitlement.remaining > 0
                              ? "bg-accent/15 text-accent"
                              : "bg-border text-muted"
                          }`}
                          title="Intervenciones que le quedan en este punto"
                        >
                          Quedan {entitlement.remaining}
                        </span>
                        <form
                          action={grantExtraAgileIntervention}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input type="hidden" name="councilId" value={councilId} />
                          <input type="hidden" name="slug" value={slug} />
                          <input type="hidden" name="scouterId" value={p.scouterId} />
                          <input type="hidden" name="agendaItemId" value={activeAgendaItem!.id} />
                          <button
                            type="submit"
                            title="Conceder una intervención extra en este punto"
                            className="rounded-md border border-border px-1.5 py-0.5 text-xs text-muted hover:border-accent hover:text-accent"
                          >
                            +1
                          </button>
                        </form>
                      </>
                    )}
                    <form
                      action={removeAgileModerationParticipant}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input type="hidden" name="councilId" value={councilId} />
                      <input type="hidden" name="slug" value={slug} />
                      <input type="hidden" name="scouterId" value={p.scouterId} />
                      <button type="submit" className="text-xs text-muted hover:text-branch-clan">
                        Quitar
                      </button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col items-center justify-center gap-6 rounded-lg border border-border p-8">
          {!selectedSpeaker ? (
            <p className="text-center text-sm text-muted">
              Selecciona a alguien de la lista para empezar su turno de palabra.
            </p>
          ) : (
            <>
              <p className={`text-lg font-medium ${selectedSpeaker.penalized ? "text-branch-clan" : "text-foreground"}`}>
                {selectedSpeaker.name}
              </p>
              {running ? (
                <>
                  <div
                    className={`text-8xl font-bold tabular-nums ${
                      seconds <= 5 ? "animate-pulse text-branch-clan" : "text-foreground"
                    }`}
                  >
                    {seconds}
                  </div>
                  <button
                    type="button"
                    onClick={() => finish(false)}
                    className="rounded-md border border-branch-clan px-6 py-3 text-lg font-medium text-branch-clan transition hover:bg-branch-clan/10"
                  >
                    Detener
                  </button>
                </>
              ) : alarmRinging ? (
                <>
                  <div className="animate-pulse text-6xl">⏰</div>
                  <p className="text-center text-sm font-medium text-branch-clan">
                    ¡Se acabó el tiempo de {selectedSpeaker.name}!
                  </p>
                  <button
                    type="button"
                    onClick={stopAlarm}
                    className="rounded-md border border-branch-clan px-6 py-3 text-lg font-medium text-branch-clan transition hover:bg-branch-clan/10"
                  >
                    🔕 Detener alarma
                  </button>
                </>
              ) : (
                <div className="flex flex-wrap justify-center gap-4">
                  {availableDurations.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => handleStart(d)}
                      className="flex h-28 w-28 flex-col items-center justify-center rounded-full border-2 border-accent text-2xl font-semibold text-accent transition hover:bg-accent/10"
                    >
                      {d}s
                    </button>
                  ))}
                </div>
              )}
              {selectedSpeaker.penalized && !running && !alarmRinging && (
                <p className="text-center text-xs text-branch-clan">
                  Penalizado por no responder la encuesta: solo temporizador de 15s.
                </p>
              )}
              {!selectedSpeaker.penalized && fixedTurnSeconds !== null && !running && !alarmRinging && (
                <p className="text-center text-xs text-muted">
                  Este punto tiene turnos fijos de {fixedTurnSeconds}s.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
