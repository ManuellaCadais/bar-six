import { cn } from '@/lib/cn';
import type { MenuItem } from '@/lib/types';

/** Miniatura do item: foto quando houver, senão fallback com a cor da categoria + anilha. */
export function Thumb({
  item,
  color,
  size = 'md',
}: {
  item: Pick<MenuItem, 'name' | 'image_url'>;
  color: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const dims = size === 'lg' ? 'h-20 w-20' : size === 'sm' ? 'h-11 w-11' : 'h-16 w-16';

  if (item.image_url) {
    return (
      <div className={cn('relative flex-none overflow-hidden rounded-xl', dims)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.image_url}
          alt={item.name}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative flex-none grid place-items-center overflow-hidden rounded-xl',
        dims,
      )}
      style={{
        background: `radial-gradient(120% 120% at 30% 18%, ${color}33, ${color}12 55%, transparent 75%), #17100c`,
      }}
      aria-hidden
    >
      <svg viewBox="0 0 40 40" className="absolute inset-0 h-full w-full opacity-45">
        <circle cx="20" cy="20" r="13" fill="none" stroke={color} strokeOpacity="0.55" strokeWidth="3.5" />
        <circle cx="20" cy="20" r="3.6" fill="none" stroke={color} strokeOpacity="0.7" strokeWidth="1.4" />
      </svg>
      <span className="relative font-display text-lg leading-none" style={{ color }}>
        {item.name.charAt(0).toUpperCase()}
      </span>
    </div>
  );
}
