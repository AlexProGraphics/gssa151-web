import ExcelJS from "exceljs";
import { dbAll } from "@/lib/db";
import { getCurrentAdmin } from "@/lib/auth";

// Antes no existía ningún export de las propuestas de parrilla que envían
// los scouters (tabla proposals/proposal_assignments) — solo el de la
// propuesta PERSONAL del usuario logueado (mi-parrilla), que para un admin
// que nunca ha tocado "Crea tu parrilla" sale vacía. Este exporta TODAS las
// propuestas recibidas, una fila por scouter y propuesta.
export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return new Response("No autenticado.", { status: 401 });
  }

  const scouters = await dbAll<{ id: string; name: string }>(
    "SELECT id, name FROM scouters WHERE active = 1 ORDER BY name",
  );
  const nameById = new Map(scouters.map((s) => [s.id, s.name]));

  const units = await dbAll<{ id: string; name: string }>(
    "SELECT id, name FROM units ORDER BY sort_order",
  );
  const unitNameById = new Map(units.map((u) => [u.id, u.name]));

  const proposals = await dbAll<{ id: string; ownerId: string; submittedAt: string }>(
    `SELECT proposals.id AS id, proposals.owner_id AS ownerId, proposals.submitted_at AS submittedAt
     FROM proposals ORDER BY submitted_at DESC`,
  );

  const assignmentRows = await dbAll<{ proposalId: string; scouterId: string; unitId: string }>(
    "SELECT proposal_id AS proposalId, scouter_id AS scouterId, unit_id AS unitId FROM proposal_assignments",
  );
  const assignmentsByProposal = new Map<string, { scouterId: string; unitId: string }[]>();
  for (const row of assignmentRows) {
    const list = assignmentsByProposal.get(row.proposalId) ?? [];
    list.push(row);
    assignmentsByProposal.set(row.proposalId, list);
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Propuestas de parrilla");
  sheet.columns = [
    { header: "Autor de la propuesta", width: 24 },
    { header: "Fecha de envío", width: 20 },
    { header: "Scouter", width: 24 },
    { header: "Unidad propuesta", width: 28 },
  ];
  sheet.getRow(1).font = { bold: true };

  for (const proposal of proposals) {
    const ownerName = nameById.get(proposal.ownerId) ?? proposal.ownerId;
    const submitted = new Date(proposal.submittedAt).toLocaleString("es-ES");
    const placed = assignmentsByProposal.get(proposal.id) ?? [];
    const placedIds = new Set(placed.map((a) => a.scouterId));

    for (const a of placed) {
      sheet.addRow([
        ownerName,
        submitted,
        nameById.get(a.scouterId) ?? a.scouterId,
        unitNameById.get(a.unitId) ?? "—",
      ]);
    }
    for (const scouter of scouters) {
      if (!placedIds.has(scouter.id)) {
        sheet.addRow([ownerName, submitted, scouter.name, "Sin asignar"]);
      }
    }
  }

  if (proposals.length === 0) {
    sheet.addRow(["—", "—", "Todavía no ha llegado ninguna propuesta.", "—"]);
  }

  const buffer = await workbook.xlsx.writeBuffer();

  return new Response(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="propuestas-parrilla-gssa151.xlsx"',
    },
  });
}
