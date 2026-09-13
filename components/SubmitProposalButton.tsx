"use client";

import { useFormStatus } from "react-dom";
import { submitProposal } from "@/app/actions";

function SubmitButtonInner({ alreadySent }: { alreadySent: boolean }) {
  const { pending } = useFormStatus();

  if (alreadySent) {
    return (
      <button
        type="submit"
        disabled
        title="Ya has enviado esta propuesta tal cual está — mueve algo para poder reenviarla"
        className="flex items-center gap-1.5 rounded-md border border-branch-tropa/50 bg-branch-tropa/10 px-3 py-1.5 text-sm font-medium text-branch-tropa"
      >
        <span aria-hidden>✓</span> Propuesta enviada
      </button>
    );
  }

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md border border-accent px-3 py-1.5 text-sm font-medium text-accent transition hover:bg-accent/10 disabled:opacity-60"
    >
      {pending ? "Enviando…" : "Enviar propuesta al kraal"}
    </button>
  );
}

export function SubmitProposalButton({
  alreadySent,
  lastSubmittedAt,
}: {
  alreadySent: boolean;
  lastSubmittedAt: string | null;
}) {
  return (
    <div className="flex flex-col items-start gap-1">
      <form action={submitProposal}>
        <SubmitButtonInner alreadySent={alreadySent} />
      </form>
      {alreadySent && lastSubmittedAt && (
        <span className="text-xs text-muted">
          Enviada el {new Date(lastSubmittedAt).toLocaleString("es-ES")}
        </span>
      )}
    </div>
  );
}
