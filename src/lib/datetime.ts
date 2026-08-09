import { BAR_TIMEZONE } from './constants';

const WEEKDAY_INDEX: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

/**
 * "Agora" no fuso do bar (America/Sao_Paulo), independente do fuso do servidor.
 * Retorna a data YYYY-MM-DD e o dia da semana (0=Dom … 6=Sáb).
 */
export function barNow(now: Date = new Date()): {
  date: string;
  weekday: number;
} {
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: BAR_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);

  const weekdayName = new Intl.DateTimeFormat('en-US', {
    timeZone: BAR_TIMEZONE,
    weekday: 'long',
  }).format(now);

  return { date, weekday: WEEKDAY_INDEX[weekdayName] ?? now.getDay() };
}

/** Minutos decorridos desde uma data ISO. */
export function minutesSince(iso: string, now: Date = new Date()): number {
  const then = new Date(iso).getTime();
  return Math.max(0, Math.floor((now.getTime() - then) / 60000));
}

/** Segundos decorridos desde uma data ISO. */
export function secondsSince(iso: string, now: Date = new Date()): number {
  const then = new Date(iso).getTime();
  return Math.max(0, Math.floor((now.getTime() - then) / 1000));
}

/** Formata tempo decorrido como "mm:ss" (até 1h) ou "Xh Ym". */
export function formatElapsed(iso: string, now: Date = new Date()): string {
  const total = secondsSince(iso, now);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${m}min`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * ISO do início do dia de hoje no fuso do bar.
 * O Brasil não tem horário de verão desde 2019 → offset fixo -03:00.
 * Usado para filtrar o histórico "do dia".
 */
export function barDayStartISO(now: Date = new Date()): string {
  const { date } = barNow(now);
  return `${date}T00:00:00-03:00`;
}

/** Hora local do bar (HH:mm) de uma data ISO. */
export function formatBarTime(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: BAR_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}
