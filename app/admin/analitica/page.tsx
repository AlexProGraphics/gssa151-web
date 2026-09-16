import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth";
import { getAnalyticsData } from "@/lib/analytics";
import { AdminAnalyticsTable } from "@/components/AdminAnalyticsTable";

export const dynamic = "force-dynamic";

export default async function AdminAnaliticaPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/login?next=/admin/analitica");

  const { rows, metrics, units } = await getAnalyticsData();

  return (
    <main className="mx-auto flex max-w-[1400px] flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Analítica</h1>
          <p className="text-sm text-muted">
            Vista consolidada de encuesta, propuestas y datos confidenciales de
            la coordinación — solo aquí. Filtra, ordena y analiza a los{" "}
            {metrics.totalActive} scouters activos.
          </p>
        </div>
        <Link
          href="/api/export/excel/analitica"
          className="shrink-0 rounded-md border border-accent px-3 py-2 text-sm font-medium text-accent transition hover:bg-accent/10"
        >
          Exportar todo a Excel
        </Link>
      </div>
      <AdminAnalyticsTable rows={rows} metrics={metrics} units={units} />
    </main>
  );
}
