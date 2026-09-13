"use client";

import { Fragment, useMemo, useState } from "react";

export interface AnalyticsRow {
  id: string;
  name: string;
  active: boolean;
  isAdmin: boolean;
  registered: boolean;
  unitName: string | null;
  unitCategory: string | null;
  surveyResponded: boolean;
  surveySubmittedAt: string | null;
  priorityPref: "seccion" | "equipo" | null;
  availNavidadLabel: string | null;
  availSemanaSantaLabel: string | null;
  availVeranoLabel: string | null;
  mtlSelfLabel: string | null;
  cargos: string[];
  comisiones: string[];
  totalBudget: number | null;
  spentOnBranches: number | null;
  vetoCount: number;
  budgetRemaining: number | null;
  compatibles: string[];
  incompatibles: string[];
  favoritos: string[];
  previousUnitName: string | null;
  yearsInUnit: number | null;
  unitContinuityLabel: string | null;
  branchPriorityOrder: string[] | null;
  birthYear: number | null;
  mtlAdminLabel: string | null;
  totalExperienceYears: number | null;
  confianza: number | null;
  liderScore: number | null;
  proposalsCount: number;
  lastProposalAt: string | null;
}

export interface AnalyticsMetrics {
  totalActive: number;
  respondedCount: number;
  registeredCount: number;
  proposalsTotal: number;
  scoutersWithProposal: number;
  assignedCount: number;
  mtlYesCount: number;
  totalVetoes: number;
  avgConfianza: number | null;
  avgLider: number | null;
}

type SortKey =
  | "name"
  | "unitName"
  | "surveyResponded"
  | "totalBudget"
  | "vetoCount"
  | "birthYear"
  | "totalExperienceYears"
  | "confianza"
  | "liderScore"
  | "proposalsCount"
  | "registered";

type TriFilter = "all" | "yes" | "no";

function KpiCard({
  label,
  value,
  accentVar,
}: {
  label: string;
  value: string;
  accentVar: string;
}) {
  return (
    <div
      className="flex flex-col gap-1 rounded-lg border border-border bg-surface p-4"
      style={{ borderLeft: `3px solid ${accentVar}` }}
    >
      <span className="text-xs uppercase tracking-wide text-muted">{label}</span>
      <span className="text-2xl font-semibold text-foreground">{value}</span>
    </div>
  );
}

function BoolBadge({ value, yesLabel = "Sí", noLabel = "No" }: { value: boolean; yesLabel?: string; noLabel?: string }) {
  return (
    <span
      className={
        value
          ? "rounded-full bg-branch-tropa/15 px-2 py-0.5 text-xs font-medium text-branch-tropa"
          : "rounded-full bg-border/40 px-2 py-0.5 text-xs text-muted"
      }
    >
      {value ? yesLabel : noLabel}
    </span>
  );
}

export function AdminAnalyticsTable({
  rows,
  metrics,
  units,
}: {
  rows: AnalyticsRow[];
  metrics: AnalyticsMetrics;
  units: { id: string; name: string; category: string }[];
}) {
  const [search, setSearch] = useState("");
  const [unitFilter, setUnitFilter] = useState<string>("all");
  const [respondedFilter, setRespondedFilter] = useState<TriFilter>("all");
  const [registeredFilter, setRegisteredFilter] = useState<TriFilter>("all");
  const [proposalFilter, setProposalFilter] = useState<TriFilter>("all");
  const [showHidden, setShowHidden] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<1 | -1>(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const unitNames = useMemo(() => Array.from(new Set(units.map((u) => u.name))), [units]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (!showHidden && !r.active) return false;
      if (q && !r.name.toLowerCase().includes(q)) return false;
      if (unitFilter === "__sin_asignar__" && r.unitName) return false;
      if (unitFilter !== "all" && unitFilter !== "__sin_asignar__" && r.unitName !== unitFilter) return false;
      if (respondedFilter === "yes" && !r.surveyResponded) return false;
      if (respondedFilter === "no" && r.surveyResponded) return false;
      if (registeredFilter === "yes" && !r.registered) return false;
      if (registeredFilter === "no" && r.registered) return false;
      if (proposalFilter === "yes" && r.proposalsCount === 0) return false;
      if (proposalFilter === "no" && r.proposalsCount > 0) return false;
      return true;
    });
  }, [rows, search, unitFilter, respondedFilter, registeredFilter, proposalFilter, showHidden]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av === bv) return 0;
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      if (typeof av === "boolean" || typeof bv === "boolean") {
        return (av ? 1 : 0) < (bv ? 1 : 0) ? -sortDir : sortDir;
      }
      return av < bv ? -sortDir : av > bv ? sortDir : 0;
    });
    return copy;
  }, [filtered, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 1 ? -1 : 1));
    } else {
      setSortKey(key);
      setSortDir(1);
    }
  }

  function headerCell(key: SortKey, label: string) {
    const active = sortKey === key;
    return (
      <th
        onClick={() => toggleSort(key)}
        className="cursor-pointer select-none whitespace-nowrap px-3 py-2 text-left font-medium text-muted hover:text-foreground"
      >
        {label} <span className="text-[10px]">{active ? (sortDir === 1 ? "▲" : "▼") : ""}</span>
      </th>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard
          label="Encuesta respondida"
          value={`${metrics.respondedCount}/${metrics.totalActive}`}
          accentVar="var(--branch-tropa)"
        />
        <KpiCard
          label="Cuentas registradas"
          value={`${metrics.registeredCount}/${metrics.totalActive}`}
          accentVar="var(--accent)"
        />
        <KpiCard
          label="Propuestas enviadas"
          value={`${metrics.proposalsTotal}`}
          accentVar="var(--branch-apoyo)"
        />
        <KpiCard
          label="Scouters con propuesta"
          value={`${metrics.scoutersWithProposal}/${metrics.totalActive}`}
          accentVar="var(--branch-esculta)"
        />
        <KpiCard
          label="Asignados en parrilla oficial"
          value={`${metrics.assignedCount}/${metrics.totalActive}`}
          accentVar="var(--branch-manada)"
        />
        <KpiCard label="Título MTL ya sacado" value={`${metrics.mtlYesCount}`} accentVar="var(--branch-castores)" />
        <KpiCard label="Vetos declarados" value={`${metrics.totalVetoes}`} accentVar="var(--branch-clan)" />
        <KpiCard
          label="Confianza media (kraal)"
          value={metrics.avgConfianza !== null ? `${metrics.avgConfianza}/3` : "—"}
          accentVar="var(--accent)"
        />
        <KpiCard
          label="Liderazgo medio (kraal)"
          value={metrics.avgLider !== null ? `${metrics.avgLider}/3` : "—"}
          accentVar="var(--branch-apoyo)"
        />
        <KpiCard
          label="Visibles tras filtros"
          value={`${sorted.length}`}
          accentVar="var(--branch-tropa)"
        />
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface p-3">
        <label className="flex flex-col gap-1 text-xs text-muted">
          Buscar
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nombre…"
            className="rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Unidad
          <select
            value={unitFilter}
            onChange={(e) => setUnitFilter(e.target.value)}
            className="rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
          >
            <option value="all">Todas</option>
            <option value="__sin_asignar__">Sin asignar</option>
            {unitNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Encuesta
          <select
            value={respondedFilter}
            onChange={(e) => setRespondedFilter(e.target.value as TriFilter)}
            className="rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
          >
            <option value="all">Todos</option>
            <option value="yes">Respondida</option>
            <option value="no">Sin responder</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Cuenta
          <select
            value={registeredFilter}
            onChange={(e) => setRegisteredFilter(e.target.value as TriFilter)}
            className="rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
          >
            <option value="all">Todos</option>
            <option value="yes">Registrada</option>
            <option value="no">Sin registrar</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Propuesta
          <select
            value={proposalFilter}
            onChange={(e) => setProposalFilter(e.target.value as TriFilter)}
            className="rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
          >
            <option value="all">Todos</option>
            <option value="yes">Ha enviado</option>
            <option value="no">No ha enviado</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 pb-1.5 text-xs text-muted">
          <input type="checkbox" checked={showHidden} onChange={(e) => setShowHidden(e.target.checked)} />
          Incluir ocultos
        </label>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[1200px] border-collapse text-sm">
          <thead className="sticky top-0 bg-surface">
            <tr className="border-b border-border">
              {headerCell("name", "Scouter")}
              {headerCell("unitName", "Unidad")}
              {headerCell("surveyResponded", "Encuesta")}
              {headerCell("registered", "Cuenta")}
              <th className="whitespace-nowrap px-3 py-2 text-left font-medium text-muted">Cargos / comisiones</th>
              <th className="whitespace-nowrap px-3 py-2 text-left font-medium text-muted">Disponibilidad</th>
              <th className="whitespace-nowrap px-3 py-2 text-left font-medium text-muted">MTL (auto)</th>
              {headerCell("totalBudget", "Budget")}
              {headerCell("vetoCount", "Vetos")}
              <th className="whitespace-nowrap px-3 py-2 text-left font-medium text-muted">Prioridad</th>
              {headerCell("proposalsCount", "Propuestas")}
              {headerCell("birthYear", "Año")}
              <th className="whitespace-nowrap px-3 py-2 text-left font-medium text-muted">MTL (kraal)</th>
              {headerCell("totalExperienceYears", "Exp. total")}
              {headerCell("confianza", "Confianza")}
              {headerCell("liderScore", "Líder")}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <Fragment key={r.id}>
                <tr
                  onClick={() => setExpandedId((id) => (id === r.id ? null : r.id))}
                  className={`cursor-pointer border-b border-border/60 hover:bg-surface/70 ${
                    r.active ? "" : "opacity-50"
                  }`}
                >
                  <td className="whitespace-nowrap px-3 py-2 font-medium text-foreground">
                    {r.name}
                    {r.isAdmin && <span className="ml-1 text-[10px] text-accent">(admin)</span>}
                    {!r.active && <span className="ml-1 text-[10px] text-muted">(oculto)</span>}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-muted">{r.unitName ?? "Sin asignar"}</td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <BoolBadge value={r.surveyResponded} yesLabel="Respondida" noLabel="Pendiente" />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <BoolBadge value={r.registered} yesLabel="Sí" noLabel="No" />
                  </td>
                  <td className="max-w-[220px] truncate px-3 py-2 text-xs text-muted">
                    {[...r.cargos, ...r.comisiones].join(", ") || "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-muted">
                    {r.surveyResponded
                      ? `N: ${r.availNavidadLabel} · SS: ${r.availSemanaSantaLabel} · V: ${r.availVeranoLabel}`
                      : "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-muted">{r.mtlSelfLabel ?? "—"}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-foreground">
                    {r.totalBudget !== null ? `${r.totalBudget} pts` : "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-muted">{r.vetoCount}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-muted">
                    {r.priorityPref === "seccion" ? "Sección" : r.priorityPref === "equipo" ? "Equipo" : "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-muted">{r.proposalsCount}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-muted">{r.birthYear ?? "—"}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-muted">{r.mtlAdminLabel ?? "—"}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-muted">{r.totalExperienceYears ?? "—"}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-muted">{r.confianza ?? "—"}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-muted">{r.liderScore ?? "—"}</td>
                </tr>
                {expandedId === r.id && (
                  <tr className="border-b border-border/60 bg-surface/40">
                    <td colSpan={15} className="px-4 py-3 text-xs text-muted">
                      <div className="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-4">
                        <p>
                          <span className="text-foreground">Favoritos:</span>{" "}
                          {r.favoritos.join(", ") || "—"}
                        </p>
                        <p>
                          <span className="text-foreground">Compatibles:</span>{" "}
                          {r.compatibles.join(", ") || "—"}
                        </p>
                        <p>
                          <span className="text-foreground">Incompatibles:</span>{" "}
                          {r.incompatibles.join(", ") || "—"}
                        </p>
                        <p>
                          <span className="text-foreground">Orden de secciones:</span>{" "}
                          {r.branchPriorityOrder?.join(" > ") ?? "—"}
                        </p>
                        <p>
                          <span className="text-foreground">Unidad curso 25/26:</span>{" "}
                          {r.previousUnitName ?? "—"}
                          {r.yearsInUnit !== null ? ` (${r.yearsInUnit} años)` : ""}
                        </p>
                        <p>
                          <span className="text-foreground">Seguiría en la unidad:</span>{" "}
                          {r.unitContinuityLabel ?? "—"}
                        </p>
                        <p>
                          <span className="text-foreground">Budget disponible:</span>{" "}
                          {r.budgetRemaining ?? "—"}
                        </p>
                        <p>
                          <span className="text-foreground">Puntos en secciones:</span>{" "}
                          {r.spentOnBranches ?? "—"}
                        </p>
                        <p>
                          <span className="text-foreground">Encuesta enviada:</span>{" "}
                          {r.surveySubmittedAt ? new Date(r.surveySubmittedAt).toLocaleString("es-ES") : "—"}
                        </p>
                        <p>
                          <span className="text-foreground">Última propuesta:</span>{" "}
                          {r.lastProposalAt ? new Date(r.lastProposalAt).toLocaleString("es-ES") : "—"}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={15} className="px-4 py-6 text-center text-sm text-muted">
                  Ningún scouter cumple estos filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
