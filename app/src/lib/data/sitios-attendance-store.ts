// Persistencia de asistencia de Sitios (Llegó / No llegó) para el modo mock.
// Upstash Redis si está disponible; si no, memoria. Clave = reservationId.

import { Redis } from '@upstash/redis';
import type { SitioAttendance } from '@/lib/types';

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

const K_INDEX = 'sitios:asistencia:index';
const K_ITEM = (rid: string) => `sitios:asistencia:${rid}`;

declare global {
  // eslint-disable-next-line no-var
  var __baldecash_sitios_attendance: SitioAttendance[] | undefined;
}
function mem(): SitioAttendance[] {
  if (!globalThis.__baldecash_sitios_attendance)
    globalThis.__baldecash_sitios_attendance = [];
  return globalThis.__baldecash_sitios_attendance;
}

export async function listAttendance(): Promise<SitioAttendance[]> {
  if (!isKvAvailable()) return [...mem()];
  const ids = (await kv().smembers(K_INDEX)) as string[];
  if (ids.length === 0) return [];
  const rows = (await kv().mget(...ids.map(K_ITEM))) as (SitioAttendance | null)[];
  return rows.filter((a): a is SitioAttendance => !!a);
}

export async function setAttendance(
  data: Omit<SitioAttendance, 'id' | 'status'> & {
    status: SitioAttendance['status'] | null;
  },
): Promise<SitioAttendance | null> {
  const rid = data.reservationId;

  // status null/'' => borrar.
  if (!data.status) {
    if (!isKvAvailable()) {
      globalThis.__baldecash_sitios_attendance = mem().filter(
        (a) => a.reservationId !== rid,
      );
      return null;
    }
    await kv().del(K_ITEM(rid));
    await kv().srem(K_INDEX, rid);
    return null;
  }

  const item: SitioAttendance = {
    id: rid,
    reservationId: rid,
    date: data.date,
    person: data.person,
    desk: data.desk,
    floor: data.floor,
    status: data.status,
  };

  if (!isKvAvailable()) {
    const store = mem();
    const idx = store.findIndex((a) => a.reservationId === rid);
    if (idx >= 0) store[idx] = item;
    else store.push(item);
    return item;
  }
  await kv().set(K_ITEM(rid), item);
  await kv().sadd(K_INDEX, rid);
  return item;
}
