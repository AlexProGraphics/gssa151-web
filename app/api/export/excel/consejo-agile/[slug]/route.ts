import ExcelJS from "exceljs";
import { dbAll, dbGet } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { AGILE_PAG_AMBITO_LABEL } from "@/lib/types";

interface ResponseRow {
  scouterName: string;
  pagSocial: string | null;
  pagAmbiental: string | null;
  pagEspiritual: string | null;
  pagSalud: string | null;
  calendarReviewed: number;
  calendarComments: string | null;
  chavalesExcelDone: number;
  chavalesComments: string | null;
  ruegosPreguntas: string | null;
  submittedAt: string;
}

// Las respuestas de un consejo AGILE son públicas para todo el kraal (ver
// disclaimer en /consejos-agile/[slug]), no confidenciales como la encuesta
// — así que aquí basta con estar logueado, no hace falta ser admin.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("No autenticado.", { status: 401 });
  }

  const { slug } = await params;
  const council = await dbGet<{ id: string; title: string }>(
    "SELECT id, title FROM agile_councils WHERE slug = ?",
    [slug],
  );
  if (!council) {
    return new Response("Consejo no encontrado.", { status: 404 });
  }

  const rows = await dbAll<ResponseRow>(
    `SELECT s.name AS scouterName, r.pag_social AS pagSocial, r.pag_ambiental AS pagAmbiental,
            r.pag_espiritual AS pagEspiritual, r.pag_salud AS pagSalud,
            r.calendar_reviewed AS calendarReviewed, r.calendar_comments AS calendarComments,
            r.chavales_excel_done AS chavalesExcelDone, r.chavales_comments AS chavalesComments,
            r.ruegos_preguntas AS ruegosPreguntas, r.submitted_at AS submittedAt
     FROM agile_council_responses r
     JOIN scouters s ON s.id = r.scouter_id
     WHERE r.council_id = ?
     ORDER BY s.name`,
    [council.id],
  );

  const workbook = new ExcelJS.Workbook();
  // Nombre de pestaña simple y legible — sin acentos ni caracteres raros
  // para que Excel no se queje al abrirlo.
  const sheet = workbook.addWorksheet(council.title.replace(/[\\/*?:[\]]/g, ""));
  sheet.columns = [
    { header: "Scouter", width: 22 },
    { header: "Enviado", width: 20 },
    { header: "Calendario revisado", width: 18 },
    { header: "Comentarios calendario", width: 30 },
    { header: `PAG — ${AGILE_PAG_AMBITO_LABEL.social}`, width: 34 },
    { header: `PAG — ${AGILE_PAG_AMBITO_LABEL.ambiental}`, width: 34 },
    { header: `PAG — ${AGILE_PAG_AMBITO_LABEL.espiritual}`, width: 34 },
    { header: `PAG — ${AGILE_PAG_AMBITO_LABEL.salud}`, width: 34 },
    { header: "Excel chavales rellenado", width: 20 },
    { header: "Comentarios pasos de sección", width: 30 },
    { header: "Ruegos y preguntas", width: 34 },
  ];
  sheet.getRow(1).font = { bold: true };

  for (const r of rows) {
    sheet.addRow([
      r.scouterName,
      new Date(r.submittedAt).toLocaleString("es-ES"),
      r.calendarReviewed === 1 ? "Sí" : "No",
      r.calendarComments ?? "",
      r.pagSocial ?? "",
      r.pagAmbiental ?? "",
      r.pagEspiritual ?? "",
      r.pagSalud ?? "",
      r.chavalesExcelDone === 1 ? "Sí" : "No",
      r.chavalesComments ?? "",
      r.ruegosPreguntas ?? "",
    ]);
  }

  if (rows.length === 0) {
    sheet.addRow(["Todavía no hay ninguna respuesta enviada para este consejo."]);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const safeSlug = slug.replace(/[^a-z0-9-]/gi, "") || "consejo-agile";

  return new Response(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="respuestas-${safeSlug}.xlsx"`,
    },
  });
}
