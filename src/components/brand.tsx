import { cn } from '@/lib/cn';

/** Logo SIX + SPORT LIFE, empilhado como nos copos. */
export function Wordmark({
  className,
  subClassName,
}: {
  className?: string;
  subClassName?: string;
}) {
  return (
    <span className={cn('inline-flex flex-col items-center leading-none', className)}>
      <span className="six-wordmark text-[1.6em]">SIX</span>
      <span className={cn('six-sub text-[0.42em] mt-[0.35em]', subClassName)}>
        Sport Life
      </span>
    </span>
  );
}

/** Selo circular "Wowness Club · SIX", monocromático (currentColor). */
export function Seal({
  className,
  label = 'Wowness Club',
}: {
  className?: string;
  label?: string;
}) {
  const ring = `${label} · ${label} · `;
  return (
    <svg
      viewBox="0 0 120 120"
      className={cn('block', className)}
      role="img"
      aria-label={`Selo ${label} SIX`}
    >
      <defs>
        <path
          id="seal-circle"
          d="M60,60 m-43,0 a43,43 0 1,1 86,0 a43,43 0 1,1 -86,0"
          fill="none"
        />
      </defs>
      <circle cx="60" cy="60" r="57.5" fill="none" stroke="currentColor" strokeOpacity="0.55" strokeWidth="1" />
      <circle cx="60" cy="60" r="46" fill="none" stroke="currentColor" strokeOpacity="0.35" strokeWidth="0.75" />
      <text
        fontSize="8.4"
        letterSpacing="2.1"
        fill="currentColor"
        fillOpacity="0.85"
        style={{ fontFamily: 'var(--font-oswald), sans-serif', textTransform: 'uppercase' }}
      >
        <textPath href="#seal-circle" startOffset="0">
          {ring}
        </textPath>
      </text>
      <text
        x="60"
        y="60"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="30"
        fill="currentColor"
        style={{ fontFamily: 'var(--font-anton), sans-serif', letterSpacing: '1px' }}
      >
        SIX
      </text>
      <line x1="42" y1="72" x2="78" y2="72" stroke="currentColor" strokeOpacity="0.4" strokeWidth="0.75" />
    </svg>
  );
}

/** Spinner com o motivo da anilha (disco de peso girando). */
export function PlateSpinner({
  size = 44,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={cn('animate-plate-spin', className)}
      role="status"
      aria-label="Carregando"
    >
      <circle cx="24" cy="24" r="19" fill="none" stroke="currentColor" strokeOpacity="0.16" strokeWidth="6" />
      <circle
        cx="24"
        cy="24"
        r="19"
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray="26 200"
      />
      <circle cx="24" cy="24" r="5.5" fill="none" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2" />
    </svg>
  );
}

/** Ornamento ✦ discreto (herdado do cardápio físico). */
export function Ornament({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2 text-cream/60', className)} aria-hidden>
      <span className="h-px w-6 bg-current opacity-40" />
      <span className="text-[0.7em] tracking-widest">✦</span>
      <span className="h-px w-6 bg-current opacity-40" />
    </span>
  );
}

/** Estrelas do selo (SIX Vila Nova = 6). */
export function Stars({ count, className }: { count: number; className?: string }) {
  return (
    <span className={cn('inline-flex gap-0.5 text-cream', className)} aria-label={`${count} estrelas`}>
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} className="text-[0.8em] leading-none">
          ✦
        </span>
      ))}
    </span>
  );
}
