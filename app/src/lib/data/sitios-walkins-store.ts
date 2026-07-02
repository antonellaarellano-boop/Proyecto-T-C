// Personas que VINIERON sin reservar (walk-ins) en Sitios / Desk Buddy.
// IMPORTANTE: es un dato PROPIO del sistema — NO existe en el Supabase de Desk
// Buddy y NUNCA se escribe allá. Se guarda solo localmente: Upstash Redis si
// está disponible, si no memoria.

import { randomUUID } from 'crypto';
import { Redis } from '@upstash/redis';
import type { SitioWalkin } from '@/lib/sitios/types';

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

const K_INDEX = 'sitios:walkins:index';
const K_ITEM = (id: string) => `sitios:walkins:${id}`;

declare global {
  // eslint-disable-next-line no-var
  var __baldecash_sitios_walkins: SitioWalkin[] | undefined;
}
function mem(): SitioWalkin[] {
  if (!globalThis.__baldecash_sitios_walkins)
    globalThis.__baldecash_sitios_walkins = [];
  return globalThis.__baldecash_sitios_walkins;
}

/** Todos los walk-ins registrados en el sistema. */
export async function listWalkins(): Promise<SitioWalkin[]> {
  if (!isKvAvailable()) return [...mem()];
  const ids = (await kv().smembers(K_INDEX)) as string[];
  if (ids.length === 0) return [];
  const rows = (await kv().mget(...ids.map(K_ITEM))) as (SitioWalkin | null)[];
  return rows.filter((w): w is SitioWalkin => !!w);
}

/** Registra una persona que vino sin reservar. */
export async function addWalkin(
  data: Omit<SitioWalkin, 'id' | 'createdAt'>,
): Promise<SitioWalkin> {
  const item: SitioWalkin = {
    id: randomUUID(),
    date: data.date,
    person: data.person,
    floorId: data.floorId ?? null,
    notes: data.notes ?? null,
    createdAt: new Date().toISOString(),
  };

  if (!isKvAvailable()) {
    mem().push(item);
    return item;
  }
  await kv().set(K_ITEM(item.id), item);
  await kv().sadd(K_INDEX, item.id);
  return item;
}

/** Elimina un walk-in del sistema. */
export async function deleteWalkin(id: string): Promise<void> {
  if (!isKvAvailable()) {
    globalThis.__baldecash_sitios_walkins = mem().filter((w) => w.id !== id);
    return;
  }
  await kv().del(K_ITEM(id));
  await kv().srem(K_INDEX, id);
}
