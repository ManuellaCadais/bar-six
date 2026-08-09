// ─────────────────────────────────────────────────────────────
//  Autenticação por PIN (painel do bar / admin)
//  Sem auth completa: cookie de sessão assinado por HMAC-SHA256.
//  Usa Web Crypto → funciona tanto em Server Actions (Node) quanto
//  no middleware (Edge runtime).
// ─────────────────────────────────────────────────────────────

export type SessionRole = 'bar' | 'admin';

export const SESSION_COOKIE = 'six_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12 horas

const encoder = new TextEncoder();

function requireSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 8) {
    throw new Error(
      'SESSION_SECRET ausente ou muito curto. Defina um segredo aleatório longo no ambiente.',
    );
  }
  return secret;
}

function toHex(bytes: Uint8Array): string {
  let out = '';
  for (const b of bytes) out += b.toString(16).padStart(2, '0');
  return out;
}

async function sha256Hex(data: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  return toHex(new Uint8Array(buf));
}

async function hmacHex(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return toHex(new Uint8Array(sig));
}

/** Comparação em tempo constante (mitiga timing attacks). */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/** Hash de PIN gravado na tabela settings (nunca guardamos o PIN em texto). */
export async function hashPin(pin: string): Promise<string> {
  return sha256Hex(`${pin.trim()}::${requireSecret()}`);
}

export async function verifyPin(pin: string, storedHash: string): Promise<boolean> {
  const candidate = await hashPin(pin);
  return timingSafeEqual(candidate, storedHash);
}

/** Cria o token de sessão assinado: `role.exp.assinatura`. */
export async function createSessionToken(
  role: SessionRole,
  now: number = Date.now(),
): Promise<string> {
  const exp = now + SESSION_TTL_MS;
  const payload = `${role}.${exp}`;
  const sig = await hmacHex(requireSecret(), payload);
  return `${payload}.${sig}`;
}

/** Verifica assinatura + expiração e retorna o papel, ou null. */
export async function verifySessionToken(
  token: string | undefined | null,
  now: number = Date.now(),
): Promise<SessionRole | null> {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [role, expStr, sig] = parts;
  if (role !== 'bar' && role !== 'admin') return null;

  const payload = `${role}.${expStr}`;
  const expected = await hmacHex(requireSecret(), payload);
  if (!timingSafeEqual(sig, expected)) return null;

  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < now) return null;

  return role;
}

/** Hierarquia de acesso: admin também acessa o painel do bar. */
export function roleCanAccess(
  role: SessionRole | null,
  area: 'bar' | 'admin',
): boolean {
  if (!role) return false;
  if (area === 'bar') return role === 'bar' || role === 'admin';
  return role === 'admin';
}

export const SESSION_TTL_SECONDS = SESSION_TTL_MS / 1000;
