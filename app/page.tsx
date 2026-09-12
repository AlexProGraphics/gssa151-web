import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex max-w-3xl flex-1 flex-col items-start justify-center gap-6 px-6 py-24">
      <p className="text-sm font-medium text-accent">Grupo Scout San Agustín</p>
      <h1 className="text-4xl font-semibold tracking-tight text-foreground">
        GSSA 151
      </h1>
      <p className="max-w-xl text-lg text-muted">
        Web del grupo. Aquí puedes consultar la parrilla de unidades del
        curso 2026/27 y, si eres scouter, rellenar tu encuesta de
        preferencias.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link
          href="/parrillas"
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-background"
        >
          Ver la parrilla
        </Link>
        <Link
          href="/encuesta"
          className="rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground hover:border-accent"
        >
          Rellenar mi encuesta
        </Link>
        <Link
          href="/mi-parrilla"
          className="rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground hover:border-accent"
        >
          Crea tu parrilla
        </Link>
      </div>
    </main>
  );
}
