'use client';

import * as React from 'react';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Dices, RefreshCw, ListChecks, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCanMutate } from '@/components/auth/role-context';
import { PAYMENT_MONTHS } from '@/lib/types';
import type { JuegosSnapshot, JuegoCount } from '@/lib/juegos/types';
import {
  ReservasByMonthChart,
  TopGamesChart,
  TopSlotsChart,
  TopPeopleChart,
} from './juegos-charts';

// Mes (key ene..dic) de una fecha YYYY-MM-DD.
function monthKeyOf(iso: string): string {
  const m = iso.match(/^\d{4}-(\d{2})-/);
  const idx = m ? parseInt(m[1], 10) - 1 : 0;
  return PAYMENT_MONTHS[idx]?.key ?? 'ene';
}

function fmtShort(iso?: string): string {
  if (!iso) return '—';
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}
function fmtTodayLong(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  const d = new Date(+m[1], +m[2] - 1, +m[3]);
  return d.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });
}

export function JuegosClient({ initial }: { initial: JuegosSnapshot }) {
  const canMutate = useCanMutate();
  const [snap, setSnap] = React.useState<JuegosSnapshot>(initial);
  const [live, setLive] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [lastUpdate, setLastUpdate] = React.useState<Date | null>(null);

  const clientRef = React.useRef<SupabaseClient | null>(null);
  const refetchTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const refetch = React.useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/juegos', { cache: 'no-store' });
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

  // Ocultar/restaurar una reserva SOLO en este sistema (no toca Supabase/Lovable).
  const setHidden = React.useCallback(
    async (reservationId: string, hidden: boolean) => {
      try {
        const res = await fetch('/api/juegos/hidden', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reservationId, hidden }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error((j as any).error || 'Error');
        }
        await refetch();
        return true;
      } catch (err: any) {
        toast.error(err.message || 'No se pudo actualizar');
        return false;
      }
    },
    [refetch],
  );

  const handleDelete = React.useCallback(
    async (reservationId: string, label: string) => {
      if (
        !window.confirm(
          `¿Ocultar esta reserva del dashboard?\n\n${label}\n\nEsto NO la borra de la app de juegos — solo deja de mostrarse acá.`,
        )
      )
        return;
      const ok = await setHidden(reservationId, true);
      if (ok) {
        toast.success('Reserva ocultada del sistema', {
          description: 'No se modificó nada en la app de juegos.',
          action: {
            label: 'Deshacer',
            onClick: () => setHidden(reservationId, false),
          },
        });
      }
    },
    [setHidden],
  );

  React.useEffect(() => {
    let cancelled = false;

    async function setup() {
      const res = await fetch('/api/juegos/realtime-config', { cache: 'no-store' });
      if (!res.ok) return;
      const { data } = await res.json();
      if (cancelled || !data?.url) return;

      // Con RLS de SELECT público, la anon key basta para suscribirse: no hace
      // falta un token de sesión (a diferencia de Sitios / Desk Buddy).
      if (!clientRef.current) {
        clientRef.current = createClient(data.url, data.anonKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
      }
      const client = clientRef.current;

      const channel = client.channel('juegos-live');
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reservas' },
        scheduleRefetch,
      );
      channel.subscribe((status) => {
        if (!cancelled) setLive(status === 'SUBSCRIBED');
      });
    }

    setup();
    return () => {
      cancelled = true;
      if (refetchTimer.current) clearTimeout(refetchTimer.current);
      if (clientRef.current) clientRef.current.removeAllChannels();
    };
  }, [scheduleRefetch]);

  const k = snap.kpis;

  // Personas que más reservan (histórico, sobre las reservas visibles).
  const byPerson: JuegoCount[] = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of snap.reservas) {
      const name = r.colaborador || '—';
      counts.set(name, (counts.get(name) || 0) + 1);
    }
    return Array.from(counts, ([label, count]) => ({ key: label, label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);
  }, [snap.reservas]);

  // Barra de meses: default = mes actual si tiene reservas, si no el más reciente con data.
  const monthsWithData = React.useMemo(
    () => new Set(snap.reservas.map((r) => monthKeyOf(r.dateIso))),
    [snap.reservas],
  );
  const [selectedMonth, setSelectedMonth] = React.useState<string>(() => {
    const current = monthKeyOf(snap.today);
    if (monthsWithData.has(current)) return current;
    const withData = PAYMENT_MONTHS.filter((m) => monthsWithData.has(m.key));
    return withData[withData.length - 1]?.key ?? current;
  });
  const monthInfo =
    PAYMENT_MONTHS.find((m) => m.key === selectedMonth) || PAYMENT_MONTHS[0];

  const recent = React.useMemo(
    () => snap.reservas.filter((r) => monthKeyOf(r.dateIso) === selectedMonth),
    [snap.reservas, selectedMonth],
  );

  return (
    <div className="space-y-6">
      {/* Encabezado + estado de conexión */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-brand-gold-100 p-2 text-brand-gold-700 dark:bg-brand-gold-600/20 dark:text-brand-gold-100">
            <Dices className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold">Juegos de mesa · Reservas</h1>
            <p className="text-sm text-muted-foreground">
              Datos en vivo de la app de juegos · {fmtTodayLong(snap.today)}
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
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Reservas totales" value={k.totalReservas} color="#31359C" />
        <Stat label="Personas distintas" value={k.totalPersonas} color="#00A29B" />
        <Stat label="Juego top" value={k.topGame} />
        <Stat label="Horario top" value={k.topSlot} color="#7C3AED" />
      </div>

      {/* Gráficos pedidos */}
      <TopGamesChart data={snap.byGame} />
      <ReservasByMonthChart data={snap.byMonth} />
      <div className="grid gap-6 lg:grid-cols-2">
        <TopPeopleChart data={byPerson} subtitle={`Top ${byPerson.length} · histórico`} />
        <TopSlotsChart data={snap.bySlot} />
      </div>

      {/* Reservas recientes (solo lectura) */}
      <Card>
        <CardHeader>
          <div className="flex min-w-0 items-start gap-3">
            <div className="shrink-0 rounded-xl bg-brand-blue-100 p-2 text-brand-blue-700 dark:bg-brand-blue-600/20 dark:text-brand-blue-100">
              <ListChecks className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <CardTitle>Reservas · {monthInfo.full}</CardTitle>
              <CardDescription>
                {recent.length} reserva(s) en {monthInfo.full} · {snap.reservas.length} en total
                {canMutate && ' · eliminar solo la oculta del sistema, no toca la app de juegos'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Barra de meses (Ene–Dic) */}
          <div className="mb-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Mes
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {PAYMENT_MONTHS.map((m) => {
                const active = m.key === selectedMonth;
                const has = monthsWithData.has(m.key);
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setSelectedMonth(m.key)}
                    aria-pressed={active}
                    className={cn(
                      'rounded-full border px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wide transition',
                      active
                        ? 'border-brand-gold-400 bg-brand-gold-100 text-brand-gold-700 shadow-soft dark:border-brand-gold-500 dark:bg-brand-gold-600/25 dark:text-brand-gold-100'
                        : has
                          ? 'border-border bg-card text-muted-foreground hover:border-brand-blue-200 hover:text-foreground'
                          : 'border-border bg-card text-muted-foreground/40 hover:text-muted-foreground',
                    )}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          {recent.length === 0 ? (
            <div className="flex h-20 items-center justify-center rounded-xl bg-muted/40 text-center text-sm text-muted-foreground">
              Sin reservas en {monthInfo.full}
            </div>
          ) : (
            <div className="max-h-[460px] overflow-auto rounded-xl border border-border">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-muted/40 text-left">
                    <Th>Fecha</Th>
                    <Th>Colaborador</Th>
                    <Th>Juego</Th>
                    <Th>Horario</Th>
                    {canMutate && <Th> </Th>}
                  </tr>
                </thead>
                <tbody>
                  {recent.map((r) => (
                    <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                      <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">{fmtShort(r.dateIso)}</td>
                      <td className="px-3 py-2.5 font-medium text-foreground">{r.colaborador || '—'}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{r.gameName}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">{r.slotLabel}</td>
                      {canMutate && (
                        <td className="px-3 py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              handleDelete(
                                r.id,
                                `${r.colaborador || '—'} · ${r.gameName} · ${r.slotLabel} · ${fmtShort(r.dateIso)}`,
                              )
                            }
                            className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs font-medium text-muted-foreground transition hover:border-rose-300 hover:text-rose-600 dark:hover:text-rose-300"
                            title="Ocultar del sistema (no borra en la app de juegos)"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Eliminar
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {lastUpdate && (
        <p className="text-right text-xs text-muted-foreground">
          Última actualización: {lastUpdate.toLocaleTimeString('es-PE')}
        </p>
      )}
    </div>
  );
}

// ============================================================================
function Stat({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-soft">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className="mt-0.5 truncate font-display text-2xl font-bold tabular-nums"
        style={color ? { color } : undefined}
        title={String(value)}
      >
        {value}
      </p>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </th>
  );
}
