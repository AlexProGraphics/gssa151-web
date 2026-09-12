import ExcelJS from "exceljs";
import { dbAll } from "@/lib/db";
import { getCurrentScouter } from "@/lib/auth";

// Exporta el borrador PERSONAL del scouter logueado (proposal_draft_assignments),
// nunca la parrilla oficial. Solo toca tablas públicas + su propio borrador.
export async function GET() {
  const owner = await getCurrentScouter();
  if (!owner) {
    return new Response("No autenticado.", { status: 401 });
  }

  const units = await dbAll<{ id: string; name: string }>(
    "SELECT id, name FROM units ORDER BY sort_order",
  );
  const scouters = await dbAll<{ id: string; name: string }>(
    "SELECT id, name FROM scouters WHERE active = 1 ORDER BY name",
  );
  const draft = await dbAll<{ scouterId: string; unitId: string }>(
    "SELECT scouter_id AS scouterId, unit_id AS unitId FROM proposal_draft_assignments WHERE owner_id = ?",
    [owner.scouterId],
  );

  const unitNameById = new Map(units.map((u) => [u.id, u.name]));
  const unitByScouter = new Map(draft.map((a) => [a.scouterId, a.unitId]));

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Mi propuesta");
  sheet.columns = [
    { header: "Scouter", width: 24 },
    { header: "Unidad", width: 28 },
  ];
  sheet.addRow(["Scouter", "Unidad"]);

  for (const scouter of scouters) {
    const unitId = unitByScouter.get(scouter.id);
    const unitName = unitId ? unitNameById.get(unitId) ?? "Sin asignar" : "Sin asignar";
    sheet.addRow([scouter.name, unitName]);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const safeName = owner.name.replace(/[^a-z0-9]+/gi, "-");

  return new Response(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="mi-propuesta-${safeName}.xlsx"`,
    },
  });
}
