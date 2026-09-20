import { dbGet } from "./db";

// --- Salida de Kraal 25-27 sept 2026 ---
//
// A diferencia de los Consejos AGILE, esta salida es un evento único y su
// contenido (horario, enlace de Drive) va fijo aquí en vez de en una tabla
// editable desde admin — no hace falta esa flexibilidad para un solo evento.

export const KRAAL_OUTING_TITLE = "Salida de Kraal";
export const KRAAL_OUTING_DATES = "25, 26 y 27 de septiembre de 2026";
export const KRAAL_OUTING_LOCATION = "Albergue Cabo Luna";
export const KRAAL_OUTING_PPT_DRIVE_LINK =
  "https://drive.google.com/drive/folders/1pq-TrqaUbIzbWBdQiTzWdl6c-_NQO0lR?usp=sharing";

export interface OutingScheduleItem {
  time: string;
  title: string;
  responsible?: string;
}

export interface OutingScheduleDay {
  day: string;
  items: OutingScheduleItem[];
  note?: string;
}

export const KRAAL_OUTING_SCHEDULE: OutingScheduleDay[] = [
  {
    day: "Viernes 25",
    items: [
      { time: "19:00 aprox.", title: "Salida de Madrid" },
      { time: "Noche", title: "Teambuilding" },
    ],
    note: "Los coches se organizan en el mensaje de coches del Kraal serio: apúntate ahí (quién lleva coche y cuántas plazas libres tiene) para salir juntos y aprovechar los coches al máximo.",
  },
  {
    day: "Sábado 26",
    items: [
      { time: "10:00–12:00", title: "Parrillas", responsible: "Coordinación" },
      {
        time: "12:15–13:30",
        title: "Metodología y trabajo de sección",
        responsible: "Coordinación + scouter de referencia de cada sección",
      },
      { time: "14:00", title: "Paella", responsible: "Julio" },
      { time: "16:00–17:45", title: "PowerPoint & Bubble Tea", responsible: "Coordinación" },
      { time: "18:00", title: "Actividad de animación", responsible: "Animación" },
      { time: "22:00", title: "Cena", responsible: "Menú" },
      { time: "Después", title: "Fiesta 🎶", responsible: "Autogestión de bebidas" },
    ],
  },
  {
    day: "Domingo 27",
    items: [
      { time: "11:00", title: "Recogida de la casa", responsible: "Todos" },
      { time: "12:00", title: "Actividad de espiritualidad en el campo", responsible: "Coordinación" },
      { time: "15:00", title: "Comida y vuelta a casa", responsible: "Pendiente reservar sitio" },
    ],
  },
];

/** Las 3 diapositivas obligatorias de la presentación personal — se enseñan
 * el sábado en el bloque "PowerPoint & Bubble Tea". */
export const KRAAL_OUTING_PPT_SLIDES = [
  {
    title: "Pasado",
    detail: "Tu infancia, colegio, familia, cosas que te gustaban de pequeño.",
  },
  {
    title: "Presente",
    detail: "Qué quieres hacer ahora: qué haces con tu vida — estudias, trabajas, deporte, algún instrumento…",
  },
  {
    title: "Futuro",
    detail: "Dónde te ves dentro de 10 años.",
  },
];

interface KraalOutingResponseRow {
  scouterId: string;
  attending: string;
  arrivalNote: string | null;
  staysUntilEnd: number;
  departureNote: string | null;
  comments: string | null;
  pptUploaded: number;
  submittedAt: string;
}

export interface KraalOutingResponse {
  scouterId: string;
  attending: "si" | "no";
  arrivalNote: string | null;
  staysUntilEnd: boolean;
  departureNote: string | null;
  comments: string | null;
  pptUploaded: boolean;
  submittedAt: string;
}

function toPlainResponse(row: KraalOutingResponseRow): KraalOutingResponse {
  return {
    scouterId: row.scouterId,
    attending: row.attending === "no" ? "no" : "si",
    arrivalNote: row.arrivalNote,
    staysUntilEnd: row.staysUntilEnd === 1,
    departureNote: row.departureNote,
    comments: row.comments,
    pptUploaded: row.pptUploaded === 1,
    submittedAt: row.submittedAt,
  };
}

export async function getKraalOutingResponse(scouterId: string): Promise<KraalOutingResponse | null> {
  const row = await dbGet<KraalOutingResponseRow>(
    `SELECT scouter_id AS scouterId, attending, arrival_note AS arrivalNote,
            stays_until_end AS staysUntilEnd, departure_note AS departureNote,
            comments, ppt_uploaded AS pptUploaded, submitted_at AS submittedAt
     FROM kraal_outing_responses WHERE scouter_id = ?`,
    [scouterId],
  );
  return row ? toPlainResponse(row) : null;
}

/** Puntito de "sin leer" en el nav: falta la encuesta de asistencia, o falta
 * marcar la presentación como subida (las dos cosas viven en la misma fila,
 * pero se comprueban por separado — se puede enviar la encuesta sin haber
 * subido todavía el PowerPoint). */
export async function isKraalOutingPending(scouterId: string): Promise<boolean> {
  const response = await getKraalOutingResponse(scouterId);
  if (!response) return true;
  return !response.pptUploaded;
}
