import Link from "next/link";

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
        <div className="flex flex-col gap-4">
          <p className="inline-flex items-center justify-center gap-2 self-center rounded-full border border-border px-3 py-1 text-xs font-medium uppercase tracking-widest text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Grupo Scout San Agustín
          </p>
          <h1 className="bg-gradient-to-r from-accent via-[#8fc4ff] to-branch-apoyo bg-clip-text text-7xl font-extrabold tracking-tight text-transparent sm:text-8xl">
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
