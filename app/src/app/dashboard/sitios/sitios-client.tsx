'use client';

import * as React from 'react';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Building2, CalendarDays, Users, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCanMutate } from '@/components/auth/role-context';
import type { SitiosSnapshot, SitioWalkin } from '@/lib/sitios/types';
import { ReservationsTable, useAttendance, fmtShort } from './_shared';
import { NoShowByPersonChart, type NoShowDatum } from './sitios-charts';
import { useWalkins, WalkinsCard } from './walkins';

const REALTIME_TABLES = [
  'reservations',
  'profiles',
  'worker_statuses',
] as const;

export function SitiosClient({
  initial,
  initialAttendance,
  initialWalkins,
}: {
  initial: SitiosSnapshot;
  initialAttendance: Record<string, string>;
  initialWalkins: SitioWalkin[];
}) {
  const canMutate = useCanMutate();
  const { walkins, add: addWalkin, remove: removeWalkin } = useWalkins(initialWalkins);
  const [snap, setSnap] = React.useState<SitiosSnapshot>(initial);
  const [live, setLive] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [lastUpdate, setLastUpdate] = React.useState<Date | null>(null);

  const { map: attMap, setStatus: setAtt } = useAttendance(initialAttendance);

  const clientRef = React.useRef<SupabaseClient | null>(null);
  const refetchTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const refetch = React.useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/sitios', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json?.data) {
          setSnap(json.data);
          setLastUpdate(new Date());
        }
      }
    } catch {
      /* el siguiente evento reintenta */
    } finally {
      setRefreshing(false);
    }
  }, []);

  const scheduleRefetch = React.useCallback(() => {
    if (refetchTimer.current) clearTimeout(refetchTimer.current);
    refetchTimer.current = setTimeout(refetch, 400);
  }, [refetch]);

  React.useEffect(() => {
    let cancelled = false;
    let tokenTimer: ReturnType<typeof setTimeout> | null = null;

    async function setup() {
      const res = await fetch('/api/sitios/realtime-token', { cache: 'no-store' });
      if (!res.ok) return;
      const { data } = await res.json();
      if (cancelled || !data?.token) return;

      if (!clientRef.current) {
        clientRef.current = createClient(data.url, data.anonKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
      }
      const client = clientRef.current;
      client.realtime.setAuth(data.token);

      const msToRefresh = Math.max(
        30_000,
        (data.expiresAt - Math.floor(Date.now() / 1000) - 120) * 1000,
      );
      tokenTimer = setTimeout(async () => {
        const r = await fetch('/api/sitios/realtime-token', { cache: 'no-store' });
        if (r.ok) {
          const j = await r.json();
          if (j?.data?.token) client.realtime.setAuth(j.data.token);
        }
      }, msToRefresh);

      const channel = client.channel('sitios-live');
      for (const table of REALTIME_TABLES) {
        channel.on(
          'postgres_changes',
          { event: '*', schema: 'public', table },
          scheduleRefetch,
        );
      }
      channel.subscribe((status) => {
        if (!cancelled) setLive(status === 'SUBSCRIBED');
      });
    }

    setup();
    return () => {
      cancelled = true;
      if (tokenTimer) clearTimeout(tokenTimer);
      if (refetchTimer.current) clearTimeout(refetchTimer.current);
      if (clientRef.current) clientRef.current.removeAllChannels();
    };
  }, [scheduleRefetch]);

  const k = snap.kpis;

  // Personas que NO llegaron a su reserva de hoy (según asistencia marcada).
  const noShowToday: NoShowDatum[] = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of snap.reservationsToday) {
      if (attMap[r.id] === 'No llegó') {
        const name = r.personName || '—';
        counts.set(name, (counts.get(name) || 0) + 1);
      }
    }
    return Array.from(counts, ([name, value]) => ({ name, value }));
  }, [snap.reservationsToday, attMap]);

  return (
    <div className="space-y-6">
      {/* Encabezado + estado de conexión */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-brand-blue-100 p-2 text-brand-blue-700 dark:bg-brand-blue-600/20 dark:text-brand-blue-100">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold">Sitios · Reserva de escritorios</h1>
            <p className="text-sm text-muted-foreground">
              Datos en vivo de Desk Buddy · {fmtTodayLong(snap.today)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
              live
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-600/25 dark:text-emerald-100'
                : 'bg-muted text-muted-foreground',
            )}
          >
            <span
              className={cn(
                'h-2 w-2 rounded-full',
                live ? 'animate-pulse bg-emerald-500' : 'bg-muted-foreground/50',
              )}
            />
            {live ? 'En vivo' : 'Conectando…'}
          </span>
          <button
            type="button"
            onClick={refetch}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
            Actualizar
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Sitios" value={k.totalDesks} />
        <Stat label="Reservados hoy" value={k.reservedToday} color="#2563EB" />
        <Stat label="Libres hoy" value={k.freeToday} color="#22C55E" />
        <Stat label="Ocupación" value={`${k.occupancyPct}%`} color="#7C3AED" />
        <Stat label="Personas" value={k.totalPeople} />
      </div>

      {/* Ocupación por piso */}
      <Card>
        <CardHeader>
          <SectionIcon tone="aqua" icon={<Building2 className="h-5 w-5" />}>
            <CardTitle>Ocupación de hoy por piso</CardTitle>
            <CardDescription>
              Ocupados (reservados + bloqueados) sobre el total de sitios · igual que Desk Buddy
            </CardDescription>
          </SectionIcon>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Leyenda de colores */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-brand-blue-500" /> Reservados
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" /> Bloqueados
            </span>
          </div>
          {snap.occupancyByFloor.length === 0 ? (
            <Empty>No hay pisos cargados</Empty>
          ) : (
            snap.occupancyByFloor.map((f) => {
              const pct = f.desks > 0 ? Math.round((f.occupiedToday / f.desks) * 100) : 0;
              const resPct = f.desks > 0 ? (f.reservedToday / f.desks) * 100 : 0;
              const blkPct = f.desks > 0 ? (f.blockedToday / f.desks) * 100 : 0;
              return (
                <div key={f.floorId}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">{f.floorName}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {f.reservedToday} reserv. · {f.blockedToday} bloq. ·{' '}
                      <span className="font-semibold text-foreground">
                        {f.occupiedToday}/{f.desks}
                      </span>{' '}
                      · {pct}%
                    </span>
                  </div>
                  <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-brand-blue-500 transition-all"
                      style={{ width: `${Math.min(100, resPct)}%` }}
                      title={`${f.reservedToday} reservado(s)`}
                    />
                    <div
                      className="h-full bg-amber-500 transition-all"
                      style={{ width: `${Math.min(100, blkPct)}%` }}
                      title={`${f.blockedToday} bloqueado(s)`}
                    />
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Gráfico: quiénes no llegaron a su reserva de hoy */}
      <NoShowByPersonChart data={noShowToday} monthLabel="hoy" />

      {/* Vinieron sin reservar (hoy) — registro solo del sistema */}
      <WalkinsCard
        date={snap.today}
        dateLabel="hoy"
        floors={snap.floors}
        walkins={walkins}
        canMutate={canMutate}
        onAdd={addWalkin}
        onRemove={removeWalkin}
      />

      {/* Reservas de hoy — apiladas: Piso 2 arriba de Piso 4, con asistencia */}
      <div className="space-y-6">
        {snap.floors.map((f) => (
          <Card key={`hoy-${f.id}`}>
            <CardHeader>
              <SectionIcon tone="blue" icon={<CalendarDays className="h-5 w-5" />}>
                <CardTitle>Reservas de hoy · {f.name}</CardTitle>
                <CardDescription>
                  {snap.reservationsToday.filter((r) => r.floorId === f.id).length} reserva(s) ·
                  marcá Llegó / No llegó
                </CardDescription>
              </SectionIcon>
            </CardHeader>
            <CardContent>
              <ReservationsTable
                reservations={snap.reservationsToday.filter((r) => r.floorId === f.id)}
                showAttendance
                canMutate={canMutate}
                attMap={attMap}
                onSetAtt={setAtt}
                emptyText={`Sin reservas hoy en ${f.name}`}
                downloadName={`Reservas hoy - ${f.name} - ${snap.today}`}
              />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Estados de trabajador */}
      {snap.workerStatuses.length > 0 && (
        <Card>
          <CardHeader>
            <SectionIcon tone="aqua" icon={<Users className="h-5 w-5" />}>
              <CardTitle>Estados de trabajador</CardTitle>
              <CardDescription>{snap.workerStatuses.length} registro(s)</CardDescription>
            </SectionIcon>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-muted/40 text-left">
                    <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Persona</th>
                    <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Estado</th>
                    <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Desde</th>
                    <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Hasta</th>
                  </tr>
                </thead>
                <tbody>
                  {snap.workerStatuses.map((s) => (
                    <tr key={s.id} className="border-t border-border hover:bg-muted/30">
                      <td className="px-3 py-2.5 font-medium text-foreground">{s.personName || '—'}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{s.status}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{fmtShort(s.startDate)}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {s.isIndefinite ? 'Indefinido' : s.endDate ? fmtShort(s.endDate) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {lastUpdate && (
        <p className="text-right text-xs text-muted-foreground">
          Última actualización: {lastUpdate.toLocaleTimeString('es-PE')}
        </p>
      )}
    </div>
  );
}

// ============================================================================
function fmtTodayLong(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  const d = new Date(+m[1], +m[2] - 1, +m[3]);
  return d.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });
}

const TONES: Record<string, string> = {
  blue: 'bg-brand-blue-100 text-brand-blue-700 dark:bg-brand-blue-600/20 dark:text-brand-blue-100',
  aqua: 'bg-brand-aqua-100 text-brand-aqua-700 dark:bg-brand-aqua-600/20 dark:text-brand-aqua-100',
  gold: 'bg-brand-gold-100 text-brand-gold-700 dark:bg-brand-gold-600/20 dark:text-brand-gold-100',
  rose: 'bg-rose-100 text-rose-700 dark:bg-rose-600/20 dark:text-rose-100',
};
function SectionIcon({
  tone,
  icon,
  children,
}: {
  tone: keyof typeof TONES;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <div className={cn('shrink-0 rounded-xl p-2', TONES[tone])}>{icon}</div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-soft">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className="mt-0.5 font-display text-2xl font-bold tabular-nums"
        style={color ? { color } : undefined}
      >
        {value}
      </p>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-20 items-center justify-center rounded-xl bg-muted/40 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}
