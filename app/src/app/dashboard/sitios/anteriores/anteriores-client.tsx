'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { History } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCanMutate } from '@/components/auth/role-context';
import { PAYMENT_MONTHS } from '@/lib/types';
import type { SitiosPastData } from '@/lib/sitios/queries';
import type { SitioWalkin } from '@/lib/sitios/types';
import { ReservationsTable, useAttendance } from '../_shared';
import {
  NoShowByPersonChart,
  WalkinsByPersonChart,
  type NoShowDatum,
} from '../sitios-charts';

// Mes (key ene..dic) de una fecha YYYY-MM-DD.
function monthKeyOf(iso: string): string {
  const m = iso.match(/^\d{4}-(\d{2})-/);
  const idx = m ? parseInt(m[1], 10) - 1 : 0;
  return PAYMENT_MONTHS[idx]?.key ?? 'ene';
}

export function AnterioresClient({
  data,
  initialAttendance,
  walkins = [],
}: {
  data: SitiosPastData;
  initialAttendance: Record<string, string>;
  walkins?: SitioWalkin[];
}) {
  const canMutate = useCanMutate();
  const { map: attMap, setStatus: setAtt } = useAttendance(initialAttendance);

  // Meses con data (reservas o walk-ins), ordenados; default = el más reciente.
  const monthsWithData = React.useMemo(() => {
    const set = new Set(data.reservations.map((r) => monthKeyOf(r.date)));
    for (const w of walkins) set.add(monthKeyOf(w.date));
    return PAYMENT_MONTHS.filter((m) => set.has(m.key));
  }, [data.reservations, walkins]);

  const [selectedMonth, setSelectedMonth] = React.useState<string>(
    () => monthsWithData[monthsWithData.length - 1]?.key ?? 'jun',
  );

  const monthInfo =
    PAYMENT_MONTHS.find((m) => m.key === selectedMonth) || PAYMENT_MONTHS[5];

  const inMonth = React.useMemo(
    () => data.reservations.filter((r) => monthKeyOf(r.date) === selectedMonth),
    [data.reservations, selectedMonth],
  );

  // Gráfico: personas que NO llegaron en el mes seleccionado.
  const noShow: NoShowDatum[] = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of inMonth) {
      if (attMap[r.id] === 'No llegó') {
        const name = r.personName || '—';
        counts.set(name, (counts.get(name) || 0) + 1);
      }
    }
    return Array.from(counts, ([name, value]) => ({ name, value }));
  }, [inMonth, attMap]);

  // Gráfico: personas que vinieron SIN reservar en el mes seleccionado.
  const walkinsByPerson: NoShowDatum[] = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const w of walkins) {
      if (monthKeyOf(w.date) !== selectedMonth) continue;
      const name = w.person || '—';
      counts.set(name, (counts.get(name) || 0) + 1);
    }
    return Array.from(counts, ([name, value]) => ({ name, value }));
  }, [walkins, selectedMonth]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-brand-blue-100 p-2 text-brand-blue-700 dark:bg-brand-blue-600/20 dark:text-brand-blue-100">
          <History className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-display text-xl font-bold">Reservas anteriores</h1>
          <p className="text-sm text-muted-foreground">
            Histórico de reservas pasadas · marcá quién llegó y quién no
          </p>
        </div>
      </div>

      {/* Botones de mes (estilo RHE) */}
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Mes
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {monthsWithData.length === 0 ? (
            <span className="text-sm text-muted-foreground">Sin reservas anteriores</span>
          ) : (
            monthsWithData.map((m) => {
              const active = m.key === selectedMonth;
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
                      : 'border-border bg-card text-muted-foreground hover:border-brand-blue-200 hover:text-foreground',
                  )}
                >
                  {m.label}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Gráfico de no-shows del mes */}
      <NoShowByPersonChart data={noShow} monthLabel={monthInfo.full} />

      {/* Gráfico: vinieron sin reservar (walk-ins) del mes */}
      <WalkinsByPersonChart data={walkinsByPerson} monthLabel={monthInfo.full} />

      {/* Tablas apiladas: Piso 2 arriba de Piso 4 */}
      <div className="space-y-6">
        {data.floors.map((f) => {
          const rows = inMonth.filter((r) => r.floorId === f.id);
          return (
            <Card key={f.id}>
              <CardHeader>
                <div className="flex min-w-0 items-start gap-3">
                  <div className="shrink-0 rounded-xl bg-muted p-2 text-muted-foreground">
                    <History className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <CardTitle>
                      Reservas anteriores · {f.name} · {monthInfo.full}
                    </CardTitle>
                    <CardDescription>{rows.length} reserva(s)</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="max-h-[460px] overflow-y-auto">
                  <ReservationsTable
                    reservations={rows}
                    showDate
                    showAttendance
                    canMutate={canMutate}
                    attMap={attMap}
                    onSetAtt={setAtt}
                    emptyText={`Sin reservas de ${monthInfo.full} en ${f.name}`}
                    downloadName={`Reservas anteriores - ${f.name} - ${monthInfo.full}`}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
