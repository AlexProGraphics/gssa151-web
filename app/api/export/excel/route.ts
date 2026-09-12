import ExcelJS from "exceljs";
import { dbAll } from "@/lib/db";

// Solo toca tablas/columnas públicas (units, scouters.name, assignments).
// Nunca importar aquí scouter_scores/survey_* — ver lib/db.ts.
export async function GET() {
  const units = await dbAll<{ id: string; name: string }>(
    "SELECT id, name FROM units ORDER BY sort_order",
  );
  const scouters = await dbAll<{ id: string; name: string }>(
    "SELECT id, name FROM scouters WHERE active = 1 ORDER BY name",
  );
  const assignments = await dbAll<{ scouterId: string; unitId: string }>(
    "SELECT scouter_id AS scouterId, unit_id AS unitId FROM assignments",
  );

  const unitNameById = new Map(units.map((u) => [u.id, u.name]));
  const unitByScouter = new Map(assignments.map((a) => [a.scouterId, a.unitId]));

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Parrilla 2026-27");
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

  return new Response(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":
        'attachment; filename="parrilla-gssa151-2026-27.xlsx"',
    },
  });
}
