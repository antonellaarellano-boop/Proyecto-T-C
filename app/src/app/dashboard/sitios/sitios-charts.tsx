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
import { UserX, UserPlus } from 'lucide-react';

export interface NoShowDatum {
  name: string;
  value: number;
}

// Gráfico horizontal: personas que NO llegaron a su reserva (por cantidad).
export function NoShowByPersonChart({
  data,
  monthLabel,
}: {
  data: NoShowDatum[];
  monthLabel: string;
}) {
  const rows = React.useMemo(
    () => [...data].sort((a, b) => b.value - a.value),
    [data],
  );
  const total = rows.reduce((acc, d) => acc + d.value, 0);
  const height = Math.max(140, rows.length * 34 + 40);

  return (
    <Card>
      <CardHeader>
        <div className="flex min-w-0 items-start gap-3">
          <div className="shrink-0 rounded-xl bg-rose-100 p-2 text-rose-700 dark:bg-rose-600/20 dark:text-rose-100">
            <UserX className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <CardTitle>No llegaron a su reserva · {monthLabel}</CardTitle>
            <CardDescription>
              {rows.length} persona(s) · {total} inasistencia(s) marcada(s)
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <div className="flex h-24 items-center justify-center rounded-xl bg-muted/40 text-center text-sm text-muted-foreground">
            Nadie marcado como "No llegó" en {monthLabel}
          </div>
        ) : (
          <div style={{ width: '100%', height }}>
            <ResponsiveContainer>
              <BarChart
                layout="vertical"
                data={rows}
                margin={{ top: 4, right: 36, bottom: 4, left: 8 }}
                barCategoryGap={8}
              >
                <XAxis type="number" hide allowDecimals={false} />
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
                  formatter={(v: number) => [`${v} vez(es)`, 'No llegó']}
                />
                <Bar dataKey="value" radius={[4, 4, 4, 4]} isAnimationActive={false}>
                  {rows.map((r) => (
                    <Cell key={r.name} fill="#D14646" />
                  ))}
                  <LabelList
                    dataKey="value"
                    position="right"
                    style={{ fontSize: 11, fontWeight: 600, fill: 'currentColor' }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Gráfico horizontal: personas que vinieron SIN reservar (walk-ins), por cantidad.
export function WalkinsByPersonChart({
  data,
  monthLabel,
}: {
  data: NoShowDatum[];
  monthLabel: string;
}) {
  const rows = React.useMemo(
    () => [...data].sort((a, b) => b.value - a.value),
    [data],
  );
  const total = rows.reduce((acc, d) => acc + d.value, 0);
  const height = Math.max(140, rows.length * 34 + 40);

  return (
    <Card>
      <CardHeader>
        <div className="flex min-w-0 items-start gap-3">
          <div className="shrink-0 rounded-xl bg-brand-gold-100 p-2 text-brand-gold-700 dark:bg-brand-gold-600/20 dark:text-brand-gold-100">
            <UserPlus className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <CardTitle>Vinieron sin reservar · {monthLabel}</CardTitle>
            <CardDescription>
              {rows.length} persona(s) · {total} asistencia(s) sin reserva
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <div className="flex h-24 items-center justify-center rounded-xl bg-muted/40 text-center text-sm text-muted-foreground">
            Nadie registrado sin reserva en {monthLabel}
          </div>
        ) : (
          <div style={{ width: '100%', height }}>
            <ResponsiveContainer>
              <BarChart
                layout="vertical"
                data={rows}
                margin={{ top: 4, right: 36, bottom: 4, left: 8 }}
                barCategoryGap={8}
              >
                <XAxis type="number" hide allowDecimals={false} />
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
                  formatter={(v: number) => [`${v} vez(es)`, 'Sin reserva']}
                />
                <Bar dataKey="value" radius={[4, 4, 4, 4]} isAnimationActive={false}>
                  {rows.map((r) => (
                    <Cell key={r.name} fill="#D1A646" />
                  ))}
                  <LabelList
                    dataKey="value"
                    position="right"
                    style={{ fontSize: 11, fontWeight: 600, fill: 'currentColor' }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
