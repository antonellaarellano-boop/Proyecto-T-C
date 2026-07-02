'use client';

import * as React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
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
import { CalendarRange, Dices, Clock, UsersRound } from 'lucide-react';
import type { JuegoMonthStat, JuegoCount } from '@/lib/juegos/types';

// Paleta brand para las barras de juegos.
const GAME_COLORS = ['#31359C', '#00A29B', '#FDCA56', '#9333EA', '#3B9EE5', '#D14646', '#F97316'];

function SectionIcon({
  tone,
  icon,
  children,
}: {
  tone: 'blue' | 'aqua' | 'gold';
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const tones = {
    blue: 'bg-brand-blue-100 text-brand-blue-700 dark:bg-brand-blue-600/20 dark:text-brand-blue-100',
    aqua: 'bg-brand-aqua-100 text-brand-aqua-700 dark:bg-brand-aqua-600/20 dark:text-brand-aqua-100',
    gold: 'bg-brand-gold-100 text-brand-gold-700 dark:bg-brand-gold-600/20 dark:text-brand-gold-100',
  };
  return (
    <div className="flex min-w-0 items-start gap-3">
      <div className={`shrink-0 rounded-xl p-2 ${tones[tone]}`}>{icon}</div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function EmptyBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-24 items-center justify-center rounded-xl bg-muted/40 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

// 1) Reservas por mes (barras verticales) — reservas totales + personas distintas.
export function ReservasByMonthChart({ data }: { data: JuegoMonthStat[] }) {
  return (
    <Card>
      <CardHeader>
        <SectionIcon tone="blue" icon={<CalendarRange className="h-5 w-5" />}>
          <CardTitle>Reservas por mes</CardTitle>
          <CardDescription>
            Cantidad de reservas y personas distintas por mes
          </CardDescription>
        </SectionIcon>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyBox>Todavía no hay reservas</EmptyBox>
        ) : (
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={data} margin={{ top: 16, right: 12, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.2)" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={28} />
                <Tooltip
                  cursor={{ fill: 'rgba(148,163,184,0.12)' }}
                  formatter={(v: number, name) => [
                    `${v}`,
                    name === 'reservas' ? 'Reservas' : 'Personas',
                  ]}
                />
                <Bar dataKey="reservas" name="reservas" fill="#31359C" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                  <LabelList dataKey="reservas" position="top" style={{ fontSize: 11, fontWeight: 600, fill: 'currentColor' }} />
                </Bar>
                <Bar dataKey="personas" name="personas" fill="#00A29B" radius={[4, 4, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        <div className="mt-3 flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: '#31359C' }} /> Reservas
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: '#00A29B' }} /> Personas distintas
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// 2) Juegos más reservados (barras horizontales).
export function TopGamesChart({ data }: { data: JuegoCount[] }) {
  const rows = React.useMemo(() => [...data].sort((a, b) => b.count - a.count), [data]);
  const height = Math.max(160, rows.length * 40 + 40);
  return (
    <Card>
      <CardHeader>
        <SectionIcon tone="gold" icon={<Dices className="h-5 w-5" />}>
          <CardTitle>Juegos más reservados</CardTitle>
          <CardDescription>{rows.length} juego(s) reservado(s)</CardDescription>
        </SectionIcon>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <EmptyBox>Todavía no hay reservas</EmptyBox>
        ) : (
          <div style={{ width: '100%', height }}>
            <ResponsiveContainer>
              <BarChart
                layout="vertical"
                data={rows}
                margin={{ top: 4, right: 36, bottom: 4, left: 8 }}
                barCategoryGap={10}
              >
                <XAxis type="number" hide allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={130}
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(148,163,184,0.12)' }}
                  formatter={(v: number) => [`${v} reserva(s)`, 'Reservas']}
                />
                <Bar dataKey="count" radius={[4, 4, 4, 4]} isAnimationActive={false}>
                  {rows.map((r, i) => (
                    <Cell key={r.key} fill={GAME_COLORS[i % GAME_COLORS.length]} />
                  ))}
                  <LabelList dataKey="count" position="right" style={{ fontSize: 11, fontWeight: 600, fill: 'currentColor' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// 2b) Personas que más reservan (barras horizontales, desc por cantidad).
export function TopPeopleChart({
  data,
  title = 'Personas que más reservan',
  subtitle,
}: {
  data: JuegoCount[];
  title?: string;
  subtitle?: string;
}) {
  const rows = React.useMemo(() => [...data].sort((a, b) => b.count - a.count), [data]);
  const height = Math.max(160, rows.length * 34 + 40);
  return (
    <Card>
      <CardHeader>
        <SectionIcon tone="blue" icon={<UsersRound className="h-5 w-5" />}>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{subtitle ?? `${rows.length} persona(s) con reservas`}</CardDescription>
        </SectionIcon>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <EmptyBox>Todavía no hay reservas</EmptyBox>
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
                  dataKey="label"
                  width={180}
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(148,163,184,0.12)' }}
                  formatter={(v: number) => [`${v} reserva(s)`, 'Reservas']}
                />
                <Bar dataKey="count" radius={[4, 4, 4, 4]} isAnimationActive={false}>
                  {rows.map((r) => (
                    <Cell key={r.key} fill="#31359C" />
                  ))}
                  <LabelList dataKey="count" position="right" style={{ fontSize: 11, fontWeight: 600, fill: 'currentColor' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// 3) Horarios más reservados (barras verticales, orden cronológico).
export function TopSlotsChart({ data }: { data: JuegoCount[] }) {
  const total = data.reduce((acc, d) => acc + d.count, 0);
  return (
    <Card>
      <CardHeader>
        <SectionIcon tone="aqua" icon={<Clock className="h-5 w-5" />}>
          <CardTitle>Horarios más reservados</CardTitle>
          <CardDescription>{total} reserva(s) sobre {data.length} horario(s)</CardDescription>
        </SectionIcon>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyBox>Todavía no hay reservas</EmptyBox>
        ) : (
          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer>
              <BarChart data={data} margin={{ top: 16, right: 12, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.2)" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={28} />
                <Tooltip
                  cursor={{ fill: 'rgba(148,163,184,0.12)' }}
                  formatter={(v: number) => [`${v} reserva(s)`, 'Reservas']}
                />
                <Bar dataKey="count" fill="#00A29B" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                  <LabelList dataKey="count" position="top" style={{ fontSize: 11, fontWeight: 600, fill: 'currentColor' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
