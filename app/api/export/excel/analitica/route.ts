import ExcelJS from "exceljs";
import { getCurrentAdmin } from "@/lib/auth";
import { getAnalyticsData } from "@/lib/analytics";
import { BRANCH_LABEL, type Branch } from "@/lib/types";

// Export completo de la vista de Analítica: todo lo que se ve en esa tabla
// (encuesta + propuestas + datos confidenciales de scouter_scores) en un
// único Excel, una fila por scouter — para poder analizarlo/filtrarlo fuera
// de la web. Confidencial: mismo gate que la propia página, solo admin.
export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return new Response("No autenticado.", { status: 401 });
  }

  const { rows } = await getAnalyticsData();

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Analítica");
  sheet.columns = [
    { header: "Scouter", width: 22 },
    { header: "Activo", width: 10 },
    { header: "Admin", width: 10 },
    { header: "Registrado", width: 12 },
    { header: "Unidad asignada", width: 24 },
    { header: "Categoría unidad", width: 16 },
    { header: "Encuesta enviada", width: 16 },
    { header: "Fecha envío encuesta", width: 20 },
    { header: "Prioridad", width: 16 },
    { header: "Navidad", width: 14 },
    { header: "Semana Santa", width: 14 },
    { header: "Verano", width: 14 },
    { header: "Título MTL (autodeclarado)", width: 30 },
    { header: "Cargos", width: 24 },
    { header: "Comisiones", width: 30 },
    { header: "Budget total", width: 14 },
    { header: "Puntos en secciones", width: 18 },
    { header: "Vetos (cantidad)", width: 16 },
    { header: "Budget restante", width: 16 },
    { header: "Compatibles", width: 30 },
    { header: "Incompatibles", width: 30 },
    { header: "Favoritos", width: 30 },
    { header: "Unidad curso 25/26", width: 24 },
    { header: "Años en esa unidad", width: 16 },
    { header: "Seguiría en la unidad", width: 20 },
    { header: "Orden de prioridad secciones", width: 34 },
    { header: "Año de nacimiento", width: 16 },
    { header: "MTL (confidencial)", width: 18 },
    { header: "Experiencia total (años)", width: 20 },
    { header: "Confianza (1-3)", width: 16 },
    { header: "Líder (1-3)", width: 14 },
    { header: "Propuestas enviadas", width: 18 },
    { header: "Última propuesta", width: 20 },
  ];
  sheet.getRow(1).font = { bold: true };

  for (const r of rows) {
    sheet.addRow([
      r.name,
      r.active ? "Sí" : "No",
      r.isAdmin ? "Sí" : "No",
      r.registered ? "Sí" : "No",
      r.unitName ?? "",
      r.unitCategory ?? "",
      r.surveyResponded ? "Sí" : "No",
      r.surveySubmittedAt ? new Date(r.surveySubmittedAt).toLocaleString("es-ES") : "",
      r.priorityPref === "seccion" ? "Sección/rama" : r.priorityPref === "equipo" ? "Equipo de trabajo" : "",
      r.availNavidadLabel ?? "",
      r.availSemanaSantaLabel ?? "",
      r.availVeranoLabel ?? "",
      r.mtlSelfLabel ?? "",
      r.cargos.join(", "),
      r.comisiones.join(", "),
      r.totalBudget ?? "",
      r.spentOnBranches ?? "",
      r.vetoCount,
      r.budgetRemaining ?? "",
      r.compatibles.join(", "),
      r.incompatibles.join(", "),
      r.favoritos.join(", "),
      r.previousUnitName ?? "",
      r.yearsInUnit ?? "",
      r.unitContinuityLabel ?? "",
      r.branchPriorityOrder
        ? r.branchPriorityOrder.map((b) => BRANCH_LABEL[b as Branch] ?? b).join(" > ")
        : "",
      r.birthYear ?? "",
      r.mtlAdminLabel ?? "",
      r.totalExperienceYears ?? "",
      r.confianza ?? "",
      r.liderScore ?? "",
      r.proposalsCount,
      r.lastProposalAt ? new Date(r.lastProposalAt).toLocaleString("es-ES") : "",
    ]);
  }

  const buffer = await workbook.xlsx.writeBuffer();

  return new Response(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="analitica-gssa151.xlsx"',
    },
  });
}
