'use client';

import * as React from 'react';
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { CalendarCheck, GitCompareArrows } from 'lucide-react';

export interface ExecItem {
  id: string;
  name: string;
  scheduledAt?: string; // "YYYY-MM-DD" o "YYYY-MM-DDTHH:mm" (hora local)
  paidAt?: string; // "YYYY-MM-DD" — fecha real en que se pagó
}

const WEEKDAYS = [
  'domingo',
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
];
const MONTHS_SHORT = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
];

// Parsea como hora LOCAL (evita el corrimiento de día de new Date('YYYY-MM-DD')).
function parseLocal(s: string): Date | null {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);
  if (!m) return null;
  return new Date(+m[1], +m[2] - 1, +m[3], m[4] ? +m[4] : 0, m[5] ? +m[5] : 0);
}

// Pagos se ejecutan martes y jueves. Cortes: lunes 17:00 y miércoles 17:00.
// Se toma el próximo corte (>=) a la fecha/hora de programación; se ejecuta el
// día siguiente al corte (martes tras lunes, jueves tras miércoles).
function nextExecution(d: Date): Date {
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  for (let i = 0; i < 15; i++) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    const dow = day.getDay(); // 1 = lunes, 3 = miércoles
    if (dow === 1 || dow === 3) {
      const cutoff = new Date(
        day.getFullYear(),
        day.getMonth(),
        day.getDate(),
        17,
        0,
        0,
        0,
      );
      if (cutoff.getTime() >= d.getTime()) {
        const exec = new Date(cutoff);
        exec.setDate(cutoff.getDate() + 1);
        exec.setHours(0, 0, 0, 0);
        return exec;
      }
    }
  }
  return d;
}

function fmtDay(d: Date): string {
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}
function keyOf(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function PaymentExecutionSchedule({ items }: { items: ExecItem[] }) {
  const { groups, sinFecha } = React.useMemo(() => {
    const map = new Map<string, { date: Date; names: string[] }>();
    let sinFecha = 0;
    for (const it of items) {
      const d = it.scheduledAt ? parseLocal(it.scheduledAt) : null;
      if (!d) {
        sinFecha += 1;
        continue;
      }
      const exec = nextExecution(d);
      const k = keyOf(exec);
      const g = map.get(k) || { date: exec, names: [] };
      g.names.push(it.name);
      map.set(k, g);
    }
    const groups = Array.from(map.values()).sort(
      (a, b) => a.date.getTime() - b.date.getTime(),
    );
    return { groups, sinFecha };
  }, [items]);

  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex min-w-0 items-start gap-3">
          <div className="shrink-0 rounded-xl bg-brand-aqua-100 p-2 text-brand-aqua-700 dark:bg-brand-aqua-600/20 dark:text-brand-aqua-100">
            <CalendarCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <CardTitle>Cuándo se ejecutan los programados</CardTitle>
            <CardDescription>
              Se pagan martes y jueves · cortes lunes y miércoles 5:00 pm (pasado el
              corte, va a la fecha siguiente)
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {groups.length === 0 ? (
          <div className="flex h-28 items-center justify-center rounded-xl bg-muted/40 text-center text-sm text-muted-foreground">
            No hay programados con fecha para proyectar
          </div>
        ) : (
          <>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {groups.map((g) => (
                <div
                  key={keyOf(g.date)}
                  className="min-w-[190px] flex-1 rounded-xl border border-border bg-muted/30 p-3"
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-sm font-bold capitalize text-foreground">
                      {fmtDay(g.date)}
                    </span>
                    <span className="rounded-full bg-brand-aqua-100 px-2 text-xs font-semibold tabular-nums text-brand-aqua-700 dark:bg-brand-aqua-600/30 dark:text-brand-aqua-100">
                      {g.names.length}
                    </span>
                  </div>
                  <ul className="space-y-1">
                    {g.names.map((n, i) => (
                      <li
                        key={`${n}-${i}`}
                        className="truncate rounded-lg bg-background/60 px-2 py-1 text-xs text-foreground"
                        title={n}
                      >
                        {n}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            {sinFecha > 0 && (
              <p className="mt-3 text-xs text-muted-foreground">
                {sinFecha} programado{sinFecha === 1 ? '' : 's'} sin fecha — no se puede
                proyectar su ejecución hasta que se les cargue la fecha.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
    <ExecutionVsActualChart items={items} />
    </>
  );
}

// ============================================================================
// Gráfico: día en que DEBÍA pagarse (ejecución proyectada) vs. día REAL de pago.
// El "desfase" son los días de diferencia: + tarde (rojo), 0 a tiempo (verde),
// − adelantado (azul). Solo entran los pagos con fecha real registrada.
// ============================================================================
function diffDays(a: Date, b: Date): number {
  const da = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const db = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.round((da - db) / 86_400_000);
}

interface CompareRow {
  name: string;
  expected: Date;
  paid: Date;
  desfase: number; // paid - expected, en días
}

function ExecutionVsActualChart({ items }: { items: ExecItem[] }) {
  const rows = React.useMemo<CompareRow[]>(() => {
    const out: CompareRow[] = [];
    for (const it of items) {
      const sched = it.scheduledAt ? parseLocal(it.scheduledAt) : null;
      const paid = it.paidAt ? parseLocal(it.paidAt) : null;
      if (!sched || !paid) continue;
      const expected = nextExecution(sched);
      out.push({ name: it.name, expected, paid, desfase: diffDays(paid, expected) });
    }
    return out.sort((a, b) => b.desfase - a.desfase);
  }, [items]);

  if (rows.length === 0) return null;

  const aTiempo = rows.filter((r) => r.desfase === 0).length;
  const tarde = rows.filter((r) => r.desfase > 0).length;
  const antes = rows.filter((r) => r.desfase < 0).length;
  const colorOf = (d: number) =>
    d > 0 ? '#D14646' : d < 0 ? '#2563EB' : '#22C55E';
  const height = Math.max(180, rows.length * 38 + 40);

  return (
    <Card>
      <CardHeader>
        <div className="flex min-w-0 items-start gap-3">
          <div className="shrink-0 rounded-xl bg-violet-100 p-2 text-violet-700 dark:bg-violet-600/20 dark:text-violet-100">
            <GitCompareArrows className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <CardTitle>Programado vs. pago real · desfase</CardTitle>
            <CardDescription>
              Días entre cuándo debía ejecutarse y cuándo se pagó de verdad ·{' '}
              <span className="font-semibold text-emerald-600">{aTiempo} a tiempo</span>
              {' · '}
              <span className="font-semibold text-rose-600">{tarde} tarde</span>
              {' · '}
              <span className="font-semibold text-blue-600">{antes} antes</span>
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div style={{ width: '100%', height }}>
          <ResponsiveContainer>
            <BarChart
              layout="vertical"
              data={rows}
              margin={{ top: 4, right: 56, bottom: 4, left: 8 }}
              barCategoryGap={10}
            >
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                width={150}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                cursor={{ fill: 'rgba(148,163,184,0.12)' }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const r = payload[0].payload as CompareRow;
                  const lbl =
                    r.desfase > 0
                      ? `${r.desfase} día${r.desfase === 1 ? '' : 's'} tarde`
                      : r.desfase < 0
                        ? `${-r.desfase} día${r.desfase === -1 ? '' : 's'} antes`
                        : 'a tiempo';
                  return (
                    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
                      <p className="mb-1 font-semibold text-foreground">{r.name}</p>
                      <p className="text-muted-foreground">
                        Debía pagarse:{' '}
                        <span className="font-medium capitalize text-foreground">
                          {fmtDay(r.expected)}
                        </span>
                      </p>
                      <p className="text-muted-foreground">
                        Se pagó:{' '}
                        <span className="font-medium capitalize text-foreground">
                          {fmtDay(r.paid)}
                        </span>
                      </p>
                      <p className="mt-1 font-semibold" style={{ color: colorOf(r.desfase) }}>
                        {lbl}
                      </p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="desfase" radius={[4, 4, 4, 4]} isAnimationActive={false}>
                {rows.map((r) => (
                  <Cell key={r.name} fill={colorOf(r.desfase)} />
                ))}
                <LabelList
                  dataKey="desfase"
                  position="right"
                  formatter={(v: number) =>
                    v > 0 ? `+${v} d` : v < 0 ? `${v} d` : 'a tiempo'
                  }
                  style={{ fontSize: 11, fontWeight: 600, fill: 'currentColor' }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Cargá la fecha real en la columna "Pagado realmente" de la tabla de Programados
          para que el pago aparezca acá.
        </p>
      </CardContent>
    </Card>
  );
}
