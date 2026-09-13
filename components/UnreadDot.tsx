/** Puntito rojo de "sin leer" sobre un enlace de nav — posicionar el padre
 * con `relative`. Usado en Encuesta y Consejos AGILE mientras haya algo
 * pendiente de rellenar dentro de plazo. */
export function UnreadDot({ label }: { label: string }) {
  return (
    <span
      aria-label={label}
      title={label}
      className="absolute -right-2 -top-1.5 h-2.5 w-2.5 rounded-full border border-background bg-branch-clan"
    />
  );
}
