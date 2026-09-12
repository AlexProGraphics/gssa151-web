/**
 * Flor de lis scout: símbolo genérico heráldico (no un logo de marca),
 * compuesto a partir de un mismo "pétalo" repetido y rotado — así se
 * garantiza que las tres puntas de arriba y los remates de abajo salen
 * simétricos y con buena pinta, en vez de depender de curvas Bézier
 * dibujadas a mano una a una. Pensado para verse como un emoji: plano,
 * con degradado, sin caja ni fondo detrás.
 */
export function FleurDeLis({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 280" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="fleurGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7cb8ff" />
          <stop offset="55%" stopColor="#58a6ff" />
          <stop offset="100%" stopColor="#2e6fcc" />
        </linearGradient>
        {/* Pétalo base: en el origen, apuntando hacia arriba (punta en (0,-98), base en (0,0)). */}
        <path
          id="petal"
          d="M0,0 C10,-10 15,-22 15,-38 C15,-60 8,-82 0,-98 C-8,-82 -15,-60 -15,-38 C-15,-22 -10,-10 0,0 Z"
        />
      </defs>
      <g fill="url(#fleurGradient)">
        {/* Abanico superior: pétalo central + dos laterales que se abren hacia fuera. */}
        <use href="#petal" transform="translate(100,168) rotate(-40) scale(0.72,1)" />
        <use href="#petal" transform="translate(100,168) rotate(40) scale(0.72,1)" />
        <use href="#petal" transform="translate(100,168) scale(1,1.72)" />
        {/* Travesaño */}
        <rect x="57" y="167" width="86" height="17" rx="8.5" />
        {/* Remate inferior: gota central + dos pies que se abren hacia fuera. */}
        <use href="#petal" transform="translate(100,184) rotate(145) scale(0.42,0.6)" />
        <use href="#petal" transform="translate(100,184) rotate(-145) scale(0.42,0.6)" />
        <use href="#petal" transform="translate(100,184) rotate(180) scale(0.78,0.88)" />
      </g>
    </svg>
  );
}
