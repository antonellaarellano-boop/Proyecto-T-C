// Reservas de juegos "ocultadas" SOLO en este sistema (en caso de error).
// IMPORTANTE: esto NO borra nada en el Supabase/Lovable de origen — solo guarda
// localmente qué IDs de reserva no mostrar en el dashboard ni en las stats.
// Upstash Redis si está disponible; si no, memoria. Clave = reservationId.

import { Redis } from '@upstash/redis';

function kvUrl(): string | undefined {
  return process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
}
function kvToken(): string | undefined {
  return process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
}
function isKvAvailable(): boolean {
  return Boolean(kvUrl() && kvToken());
}

let _kv: Redis | null = null;
function kv(): Redis {
  if (!_kv) _kv = new Redis({ url: kvUrl()!, token: kvToken()! });
  return _kv;
}

const K_INDEX = 'juegos:ocultas:index';

declare global {
  // eslint-disable-next-line no-var
  var __baldecash_juegos_hidden: Set<string> | undefined;
}
function mem(): Set<string> {
  if (!globalThis.__baldecash_juegos_hidden)
    globalThis.__baldecash_juegos_hidden = new Set();
  return globalThis.__baldecash_juegos_hidden;
}

/** IDs de reservas ocultadas en este sistema. */
export async function listHiddenJuegos(): Promise<string[]> {
  if (!isKvAvailable()) return [...mem()];
  const ids = (await kv().smembers(K_INDEX)) as string[];
  return ids || [];
}

/** Oculta una reserva del dashboard (no toca Supabase). */
export async function hideJuego(reservationId: string): Promise<void> {
  if (!isKvAvailable()) {
    mem().add(reservationId);
    return;
  }
  await kv().sadd(K_INDEX, reservationId);
}

/** Restaura una reserva ocultada (vuelve a mostrarse). */
export async function unhideJuego(reservationId: string): Promise<void> {
  if (!isKvAvailable()) {
    mem().delete(reservationId);
    return;
  }
  await kv().srem(K_INDEX, reservationId);
}
