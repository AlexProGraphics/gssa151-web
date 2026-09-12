import type { Branch, MtlStatus, UnitCategory } from "./types";

// Datos reales de PARRILLAS_RONDA 26_27 (3).xlsx (hojas "Hoja 1" y "2627").
// Lucía se excluye a petición expresa del usuario.

export const SEED_UNITS: {
  id: string;
  name: string;
  category: UnitCategory;
  color: string;
  sortOrder: number;
}[] = [
  { id: "u1", name: "Colonia Castores", category: "castores", color: "#388bfd", sortOrder: 1 },
  { id: "u2", name: "Manada Khanhiwara", category: "manada", color: "#e3b341", sortOrder: 2 },
  { id: "u3", name: "Manada Roca de la Paz", category: "manada", color: "#e3b341", sortOrder: 3 },
  { id: "u4", name: "Manada Waingunga", category: "manada", color: "#e3b341", sortOrder: 4 },
  { id: "u5", name: "Tropa Eengonyama", category: "tropa", color: "#3fb950", sortOrder: 5 },
  { id: "u6", name: "Tropa Ionkere", category: "tropa", color: "#3fb950", sortOrder: 6 },
  { id: "u7", name: "Esculta Yindo", category: "esculta", color: "#f0883e", sortOrder: 7 },
  { id: "u8", name: "Esculta Yang-Do", category: "esculta", color: "#f0883e", sortOrder: 8 },
  { id: "u9", name: "Clan Annapurna", category: "clan", color: "#f85149", sortOrder: 9 },
  { id: "u10", name: "Cargos y Apoyo", category: "apoyo", color: "#a371f7", sortOrder: 10 },
];

export const SEED_SCOUTERS: { id: string; name: string }[] = [
  { id: "s01", name: "Raquel" },
  { id: "s02", name: "Diego" },
  { id: "s03", name: "Guille" },
  { id: "s04", name: "Mangon" },
  { id: "s05", name: "Alex Muñoz" },
  { id: "s06", name: "Marta Jim" },
  { id: "s07", name: "Paloma" },
  { id: "s08", name: "Gabi" },
  { id: "s09", name: "Engels" },
  { id: "s0a", name: "Ester" },
  { id: "s0b", name: "Blanca Campillo" },
  { id: "s0c", name: "Andres" },
  { id: "s0d", name: "Martina" },
  { id: "s0e", name: "Coke" },
  { id: "s0f", name: "Mateo Rico" },
  { id: "s10", name: "Marta Gi" },
  { id: "s11", name: "Alex Castellano" },
  { id: "s12", name: "Gonzalo Pelaez" },
  { id: "s13", name: "Julio" },
  { id: "s14", name: "Guerrero" },
  { id: "s15", name: "Blanca Lagunas" },
  { id: "s16", name: "Ferni" },
  { id: "s17", name: "Caveda" },
  { id: "s18", name: "Gonzalo Diaz" },
  { id: "s19", name: "Miguel" },
  { id: "s1a", name: "Rorro" },
  { id: "s1b", name: "Jimena" },
  { id: "s1c", name: "Almudena" },
  { id: "s1d", name: "Adriana" },
  { id: "s1e", name: "Cos" },
  { id: "s1f", name: "Mateo G V" },
  { id: "s20", name: "Marina" },
  { id: "s21", name: "Elena" },
];

export const SEED_SCORES: Record<
  string,
  {
    birthYear: number;
    mtlStatus: MtlStatus;
    totalExperienceYears: number;
    confianza: number;
    liderScore: number;
  }
> = {
  s1c: { birthYear: 2007, mtlStatus: "NO", totalExperienceYears: 1, confianza: 3, liderScore: 3 }, // Almudena
  s11: { birthYear: 2006, mtlStatus: "NO", totalExperienceYears: 1, confianza: 2, liderScore: 3 }, // Alex Castellano
  s12: { birthYear: 2006, mtlStatus: "SI", totalExperienceYears: 1, confianza: 2, liderScore: 3 }, // Gonzalo Pelaez
  s13: { birthYear: 2006, mtlStatus: "SI", totalExperienceYears: 1, confianza: 2, liderScore: 2 }, // Julio
  s14: { birthYear: 2006, mtlStatus: "SI", totalExperienceYears: 1, confianza: 2, liderScore: 3 }, // Guerrero
  s15: { birthYear: 2006, mtlStatus: "SI", totalExperienceYears: 1, confianza: 2, liderScore: 2 }, // Blanca Lagunas
  s16: { birthYear: 2006, mtlStatus: "SI", totalExperienceYears: 1, confianza: 2, liderScore: 2 }, // Ferni
  s17: { birthYear: 2006, mtlStatus: "EN_CURSO", totalExperienceYears: 1, confianza: 1, liderScore: 1 }, // Caveda
  s18: { birthYear: 2006, mtlStatus: "SI", totalExperienceYears: 1, confianza: 2, liderScore: 2 }, // Gonzalo Diaz
  s19: { birthYear: 2006, mtlStatus: "SI", totalExperienceYears: 1, confianza: 3, liderScore: 3 }, // Miguel
  s1a: { birthYear: 2006, mtlStatus: "NO", totalExperienceYears: 1, confianza: 1, liderScore: 1 }, // Rorro
  s1b: { birthYear: 2006, mtlStatus: "SI", totalExperienceYears: 1, confianza: 3, liderScore: 3 }, // Jimena
  s0e: { birthYear: 2005, mtlStatus: "SI", totalExperienceYears: 1, confianza: 2, liderScore: 1 }, // Coke
  s0d: { birthYear: 2005, mtlStatus: "NO", totalExperienceYears: 1, confianza: 3, liderScore: 2 }, // Martina
  s21: { birthYear: 2005, mtlStatus: "SI", totalExperienceYears: 2, confianza: 2, liderScore: 3 }, // Elena
  s0f: { birthYear: 2005, mtlStatus: "SI", totalExperienceYears: 0, confianza: 2, liderScore: 2 }, // Mateo Rico
  s10: { birthYear: 2005, mtlStatus: "SI", totalExperienceYears: 1, confianza: 3, liderScore: 2 }, // Marta Gi
  s0b: { birthYear: 2004, mtlStatus: "SI", totalExperienceYears: 2, confianza: 2, liderScore: 2 }, // Blanca Campillo
  s0c: { birthYear: 2004, mtlStatus: "SI", totalExperienceYears: 2, confianza: 3, liderScore: 3 }, // Andres
  s07: { birthYear: 2003, mtlStatus: "SI", totalExperienceYears: 4, confianza: 2, liderScore: 2 }, // Paloma
  s08: { birthYear: 2003, mtlStatus: "SI", totalExperienceYears: 4, confianza: 3, liderScore: 3 }, // Gabi
  s0a: { birthYear: 2003, mtlStatus: "NO", totalExperienceYears: 0, confianza: 2, liderScore: 1 }, // Ester
  s09: { birthYear: 2003, mtlStatus: "SI", totalExperienceYears: 2, confianza: 2, liderScore: 2 }, // Engels
  s04: { birthYear: 2002, mtlStatus: "NO", totalExperienceYears: 1, confianza: 3, liderScore: 2 }, // Mangon
  s05: { birthYear: 2002, mtlStatus: "SI", totalExperienceYears: 4, confianza: 3, liderScore: 3 }, // Alex Muñoz
  s06: { birthYear: 2002, mtlStatus: "SI", totalExperienceYears: 2, confianza: 2, liderScore: 2 }, // Marta Jim
  s03: { birthYear: 2001, mtlStatus: "SI", totalExperienceYears: 5, confianza: 2, liderScore: 3 }, // Guille
  s01: { birthYear: 2000, mtlStatus: "NO", totalExperienceYears: 4, confianza: 2, liderScore: 2 }, // Raquel
  s02: { birthYear: 2000, mtlStatus: "NO", totalExperienceYears: 2, confianza: 2, liderScore: 2 }, // Diego
};

export const SEED_BRANCH_EXPERIENCE: { scouterId: string; branch: Branch; years: number }[] = [
  { scouterId: "s1c", branch: "lobatos", years: 1 },
  { scouterId: "s11", branch: "castores", years: 1 },
  { scouterId: "s12", branch: "lobatos", years: 1 },
  { scouterId: "s13", branch: "lobatos", years: 1 },
  { scouterId: "s14", branch: "lobatos", years: 1 },
  { scouterId: "s15", branch: "lobatos", years: 1 },
  { scouterId: "s16", branch: "lobatos", years: 1 },
  { scouterId: "s17", branch: "tropa", years: 1 },
  { scouterId: "s18", branch: "tropa", years: 1 },
  { scouterId: "s19", branch: "tropa", years: 1 },
  { scouterId: "s1a", branch: "tropa", years: 1 },
  { scouterId: "s1b", branch: "tropa", years: 1 },
  { scouterId: "s0e", branch: "lobatos", years: 1 },
  { scouterId: "s0d", branch: "lobatos", years: 1 },
  { scouterId: "s21", branch: "lobatos", years: 1 },
  { scouterId: "s21", branch: "tropa", years: 1 },
  { scouterId: "s10", branch: "lobatos", years: 1 },
  { scouterId: "s0b", branch: "lobatos", years: 2 },
  { scouterId: "s0c", branch: "tropa", years: 2 },
  { scouterId: "s07", branch: "castores", years: 1 },
  { scouterId: "s07", branch: "lobatos", years: 3 },
  { scouterId: "s08", branch: "castores", years: 2 },
  { scouterId: "s08", branch: "lobatos", years: 2 },
  { scouterId: "s09", branch: "lobatos", years: 1 },
  { scouterId: "s09", branch: "escultas", years: 1 },
  { scouterId: "s04", branch: "lobatos", years: 1 },
  { scouterId: "s05", branch: "lobatos", years: 1 },
  { scouterId: "s05", branch: "tropa", years: 2 },
  { scouterId: "s05", branch: "escultas", years: 1 },
  { scouterId: "s06", branch: "castores", years: 1 },
  { scouterId: "s06", branch: "escultas", years: 1 },
  { scouterId: "s03", branch: "lobatos", years: 1 },
  { scouterId: "s03", branch: "tropa", years: 2 },
  { scouterId: "s03", branch: "escultas", years: 1 },
  { scouterId: "s01", branch: "tropa", years: 2 },
  { scouterId: "s01", branch: "escultas", years: 2 },
];

export const SEED_PREFERENCES: Record<
  string,
  { castores: number; lobatos: number; tropa: number; escultas: number; clan: number }
> = {
  s1c: { castores: 2, lobatos: 5, tropa: 2, escultas: 1, clan: 1 },
  s11: { castores: 5, lobatos: 3, tropa: 1, escultas: 1, clan: 1 },
  s12: { castores: 1, lobatos: 4, tropa: 5, escultas: 1, clan: 1 },
  s13: { castores: 1, lobatos: 5, tropa: 4, escultas: 1, clan: 1 },
  s14: { castores: 1, lobatos: 5, tropa: 3, escultas: 1, clan: 1 },
  s15: { castores: 2, lobatos: 5, tropa: 2, escultas: 1, clan: 1 },
  s16: { castores: 2, lobatos: 5, tropa: 3, escultas: 1, clan: 1 },
  s17: { castores: 4, lobatos: 3, tropa: 4, escultas: 1, clan: 1 },
  s18: { castores: 1, lobatos: 4, tropa: 5, escultas: 1, clan: 1 },
  s19: { castores: 1, lobatos: 2, tropa: 5, escultas: 1, clan: 1 },
  s1a: { castores: 1, lobatos: 2, tropa: 5, escultas: 1, clan: 1 },
  s1b: { castores: 1, lobatos: 3, tropa: 5, escultas: 1, clan: 1 },
  s0e: { castores: 1, lobatos: 4, tropa: 5, escultas: 1, clan: 1 },
  s0d: { castores: 4, lobatos: 3, tropa: 5, escultas: 4, clan: 1 },
  s21: { castores: 1, lobatos: 2, tropa: 5, escultas: 4, clan: 1 },
  s0f: { castores: 1, lobatos: 5, tropa: 4, escultas: 3, clan: 1 },
  s10: { castores: 4, lobatos: 3, tropa: 5, escultas: 2, clan: 1 },
  s0b: { castores: 1, lobatos: 3, tropa: 3, escultas: 5, clan: 1 },
  s0c: { castores: 1, lobatos: 1, tropa: 3, escultas: 5, clan: 2 },
  s07: { castores: 4, lobatos: 2, tropa: 4, escultas: 4, clan: 2 },
  s08: { castores: 1, lobatos: 5, tropa: 2, escultas: 4, clan: 3 },
  s0a: { castores: 5, lobatos: 3, tropa: 2, escultas: 1, clan: 1 },
  s09: { castores: 3, lobatos: 3, tropa: 2, escultas: 4, clan: 2 },
  s04: { castores: 1, lobatos: 5, tropa: 3, escultas: 4, clan: 2 },
  s05: { castores: 1, lobatos: 1, tropa: 2, escultas: 5, clan: 3 },
  s06: { castores: 2, lobatos: 2, tropa: 1, escultas: 5, clan: 4 },
  s03: { castores: 1, lobatos: 1, tropa: 2, escultas: 5, clan: 5 },
  s01: { castores: 1, lobatos: 2, tropa: 1, escultas: 4, clan: 5 },
  s02: { castores: 3, lobatos: 1, tropa: 1, escultas: 3, clan: 5 },
};

// Parrilla ya acordada para 2026/27 — los 4 sin puntuar quedan sin asignar.
export const SEED_ASSIGNMENTS: { scouterId: string; unitId: string }[] = [
  { scouterId: "s11", unitId: "u1" }, // Alex Castellano -> Castores
  { scouterId: "s07", unitId: "u1" }, // Paloma -> Castores

  { scouterId: "s14", unitId: "u2" }, // Guerrero -> Khanhiwara
  { scouterId: "s13", unitId: "u2" }, // Julio -> Khanhiwara
  { scouterId: "s0a", unitId: "u2" }, // Ester -> Khanhiwara
  { scouterId: "s10", unitId: "u2" }, // Marta Gi -> Khanhiwara

  { scouterId: "s15", unitId: "u3" }, // Blanca Lagunas -> Roca de la Paz
  { scouterId: "s16", unitId: "u3" }, // Ferni -> Roca de la Paz
  { scouterId: "s0f", unitId: "u3" }, // Mateo Rico -> Roca de la Paz

  { scouterId: "s08", unitId: "u4" }, // Gabi -> Waingunga
  { scouterId: "s1c", unitId: "u4" }, // Almudena -> Waingunga
  { scouterId: "s04", unitId: "u4" }, // Mangon -> Waingunga
  { scouterId: "s18", unitId: "u4" }, // Gonzalo Diaz -> Waingunga

  { scouterId: "s21", unitId: "u5" }, // Elena -> Eengonyama
  { scouterId: "s17", unitId: "u5" }, // Caveda -> Eengonyama
  { scouterId: "s12", unitId: "u5" }, // Gonzalo Pelaez -> Eengonyama

  { scouterId: "s19", unitId: "u6" }, // Miguel -> Ionkere
  { scouterId: "s1b", unitId: "u6" }, // Jimena -> Ionkere
  { scouterId: "s0e", unitId: "u6" }, // Coke -> Ionkere
  { scouterId: "s1a", unitId: "u6" }, // Rorro -> Ionkere

  { scouterId: "s05", unitId: "u7" }, // Alex Muñoz -> Yindo
  { scouterId: "s06", unitId: "u7" }, // Marta Jim -> Yindo
  { scouterId: "s09", unitId: "u7" }, // Engels -> Yindo

  { scouterId: "s0c", unitId: "u8" }, // Andres -> Yang-Do
  { scouterId: "s0b", unitId: "u8" }, // Blanca Campillo -> Yang-Do
  { scouterId: "s0d", unitId: "u8" }, // Martina -> Yang-Do

  { scouterId: "s02", unitId: "u9" }, // Diego -> Clan Annapurna
  { scouterId: "s03", unitId: "u9" }, // Guille -> Clan Annapurna
  { scouterId: "s01", unitId: "u9" }, // Raquel -> Clan Annapurna
];
