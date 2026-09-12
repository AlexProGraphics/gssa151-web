import Link from "next/link";
import { FleurDeLis } from "@/components/FleurDeLis";

const FEATURES = [
  {
    href: "/parrillas",
    title: "Parrillas",
    description: "Consulta a qué unidad pertenece cada scouter este curso.",
  },
  {
    href: "/encuesta",
    title: "Encuesta",
    description: "Rellena tus preferencias, cargos y disponibilidad.",
  },
  {
    href: "/mi-parrilla",
    title: "Crea tu parrilla",
    description: "Monta tu propia propuesta de reparto y envíasela al kraal.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex max-w-4xl flex-1 flex-col gap-16 px-6 py-16 sm:py-24">
      <div className="flex flex-col items-center gap-6 text-center">
        <FleurDeLis className="h-28 w-28 sm:h-36 sm:w-36" />
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium tracking-wide text-accent">
            Grupo Scout San Agustín
          </p>
          <h1 className="text-5xl font-semibold tracking-tight text-foreground sm:text-6xl">
            GSSA 151
          </h1>
          <p className="mx-auto max-w-xl text-lg text-muted">
            Web del grupo. Consulta la parrilla de unidades del curso 2026/27
            y, si eres scouter, rellena tu encuesta de preferencias.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/parrillas"
            className="rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-background transition hover:opacity-90"
          >
            Ver la parrilla
          </Link>
          <Link
            href="/encuesta"
            className="rounded-md border border-border bg-surface px-5 py-2.5 text-sm font-medium text-foreground transition hover:border-accent"
          >
            Rellenar mi encuesta
          </Link>
          <Link
            href="/mi-parrilla"
            className="rounded-md border border-border bg-surface px-5 py-2.5 text-sm font-medium text-foreground transition hover:border-accent"
          >
            Crea tu parrilla
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {FEATURES.map((f) => (
          <Link
            key={f.href}
            href={f.href}
            className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-5 transition hover:border-accent"
          >
            <span className="text-base font-medium text-foreground">{f.title}</span>
            <span className="text-sm text-muted">{f.description}</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
