import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth";
import { getAgileCouncilBySlug } from "@/lib/agileCouncils";
import {
  getAgendaEntitlements,
  getAgendaItems,
  getModerationParticipants,
  getOpenIntervention,
  listAddableScouters,
  type AgendaEntitlement,
} from "@/lib/agileModeration";
import { AgileModerationPanel } from "@/components/AgileModerationPanel";

export const dynamic = "force-dynamic";

export default async function AgileModerationPage({
  params,
}: PageProps<"/admin/consejos-agile/[slug]/moderacion">) {
  const { slug } = await params;

  const admin = await getCurrentAdmin();
  if (!admin) redirect(`/login?next=/admin/consejos-agile/${slug}/moderacion`);

  const council = await getAgileCouncilBySlug(slug);
  if (!council) notFound();

  const [participants, openIntervention, addableScouters, agendaItems] = await Promise.all([
    getModerationParticipants(council.id),
    getOpenIntervention(council.id),
    listAddableScouters(council.id),
    getAgendaItems(council.id),
  ]);

  // Se calculan las intervenciones concedidas/usadas de TODOS los puntos con
  // apartado de encuesta (no solo el activo) para que cambiar de punto en el
  // panel cliente no necesite ida y vuelta al servidor — son pocos puntos
  // (PAG x4, calendario, pasos de sección, ruegos), así que traerlos todos
  // de golpe es barato.
  const entitlementsByAgendaItem: Record<string, Record<string, AgendaEntitlement>> = {};
  await Promise.all(
    agendaItems
      .filter((item) => item.surveyField !== null)
      .map(async (item) => {
        const map = await getAgendaEntitlements(council.id, item.id, item.surveyField!);
        entitlementsByAgendaItem[item.id] = Object.fromEntries(map);
      }),
  );

  return (
    <main className="mx-auto flex max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Moderación — {council.title}
          </h1>
          <p className="text-sm text-muted">
            Solo visible para administradores. Se han añadido solos quienes
            respondieron la encuesta de este consejo; añade a más gente a
            mano si hace falta.
          </p>
        </div>
        <Link
          href="/admin/consejos-agile"
          className="shrink-0 text-sm text-muted hover:text-foreground"
        >
          ← Consejos AGILE
        </Link>
      </div>

      <AgileModerationPanel
        councilId={council.id}
        slug={council.slug}
        participants={participants}
        openIntervention={openIntervention}
        addableScouters={addableScouters}
        agendaItems={agendaItems}
        entitlementsByAgendaItem={entitlementsByAgendaItem}
      />
    </main>
  );
}
