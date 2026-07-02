'use client';

import * as React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
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
import {
  PARTICIPATION_COLORS,
  PARTICIPATION_STATUSES,
  type ParticipationStatus,
} from '@/lib/types';

const TOOLTIP_STYLE = {
  borderRadius: 12,
  border: '1px solid hsl(var(--border))',
  background: 'hsl(var(--popover))',
  fontSize: 12,
  boxShadow: '0 10px 40px -10px rgba(0,0,0,0.2)',
} as const;

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="h-2.5 w-2.5 rounded-full"
        style={{ background: color, boxShadow: `0 0 8px ${color}66` }}
      />
      <span className="text-muted-foreground">{label}</span>
    </span>
  );
}

function ParticipationLegend({
  statuses = PARTICIPATION_STATUSES,
}: {
  statuses?: readonly ParticipationStatus[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
      {statuses.map((s) => (
        <LegendDot key={s} color={PARTICIPATION_COLORS[s]} label={s} />
      ))}
    </div>
  );
}

// Estados que se muestran en "Participación por área": solo Participó / No Participó.
const AREA_STATUSES = PARTICIPATION_STATUSES.filter(
  (s) => s === 'Participo' || s === 'No Participo',
) as ParticipationStatus[];

// ============================================================================
// 1) Pie de participación por evento (solo colaboradores activos)
// ============================================================================
export interface EventParticipationDatum {
  eventId: string;
  eventName: string;
  breakdown: { status: ParticipationStatus; value: number }[];
  // Colaboradores activos con su área y su estado en este evento (para el panel).
  rows: { name: string; area: string; status: ParticipationStatus }[];
}

export function ParticipationPieByEvent({
  events,
}: {
  events: EventParticipationDatum[];
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle>Participación por evento</CardTitle>
            <CardDescription>
              Distribución · solo activos · tocá una porción para ver los nombres por área
            </CardDescription>
          </div>
          <ParticipationLegend />
        </div>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <EmptyState text="No hay eventos para mostrar" />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {events.map((ev) => (
              <EventPie key={ev.eventId} ev={ev} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EventPie({ ev }: { ev: EventParticipationDatum }) {
  const [sel, setSel] = React.useState<ParticipationStatus | null>(null);
  const total = ev.breakdown.reduce((acc, d) => acc + d.value, 0);

  // Nombres del estado seleccionado, agrupados y ordenados por área.
  const groups = React.useMemo(() => {
    if (!sel) return [];
    const byArea = new Map<string, string[]>();
    for (const r of ev.rows) {
      if (r.status !== sel) continue;
      const arr = byArea.get(r.area) || [];
      arr.push(r.name);
      byArea.set(r.area, arr);
    }
    return Array.from(byArea, ([area, names]) => ({
      area,
      names: names.sort((a, b) => a.localeCompare(b)),
    })).sort((a, b) => a.area.localeCompare(b.area));
  }, [sel, ev.rows]);

  return (
    <div className="rounded-xl bg-muted/40 p-4">
      <p className="mb-1 truncate text-center text-sm font-semibold text-foreground" title={ev.eventName}>
        {ev.eventName}
      </p>
      <div className="relative mx-auto h-40 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={ev.breakdown}
              dataKey="value"
              nameKey="status"
              innerRadius="58%"
              outerRadius="90%"
              paddingAngle={2}
              strokeWidth={0}
              startAngle={90}
              endAngle={-270}
              onClick={(d: any) => {
                const s = (d?.status ?? d?.payload?.status) as ParticipationStatus;
                if (s) setSel((prev) => (prev === s ? null : s));
              }}
            >
              {ev.breakdown.map((d) => (
                <Cell
                  key={d.status}
                  fill={PARTICIPATION_COLORS[d.status]}
                  cursor="pointer"
                  opacity={sel && sel !== d.status ? 0.35 : 1}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(v: any, name: any) => [
                `${v} (${total > 0 ? Math.round((Number(v) / total) * 100) : 0}%)`,
                name,
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-2xl font-bold leading-none tabular-nums text-foreground">
            {total}
          </span>
          <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
            marcados
          </span>
        </div>
      </div>

      {/* Panel de nombres por área del estado seleccionado */}
      {sel && (
        <div className="mt-3 border-t border-border pt-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span
              className="inline-flex items-center gap-1.5 text-xs font-semibold"
              style={{ color: PARTICIPATION_COLORS[sel] }}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: PARTICIPATION_COLORS[sel] }} />
              {sel}
            </span>
            <button
              type="button"
              onClick={() => setSel(null)}
              className="text-[11px] font-medium text-muted-foreground hover:text-foreground"
            >
              Cerrar
            </button>
          </div>
          {groups.length === 0 ? (
            <p className="text-xs italic text-muted-foreground">Nadie</p>
          ) : (
            <div className="space-y-2">
              {groups.map((g) => (
                <div key={g.area}>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {g.area} <span className="font-normal">({g.names.length})</span>
                  </p>
                  <ul className="mt-0.5 space-y-0.5">
                    {g.names.map((n) => (
                      <li key={n} className="truncate text-xs text-foreground" title={n}>
                        {n}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 2) Participación por área (stacked bar — solo colaboradores activos)
// ============================================================================
export interface AreaParticipationRow {
  area: string;
  // Una clave por estado de participación con su conteo.
  [status: string]: string | number;
}

export function ParticipationByAreaChart({
  data,
}: {
  data: AreaParticipationRow[];
}) {
  const sorted = [...data];

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle>Participación por área</CardTitle>
            <CardDescription>
              Participó vs No Participó acumulado por área · solo activos
            </CardDescription>
          </div>
          <ParticipationLegend statuses={AREA_STATUSES} />
        </div>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <EmptyState text="No hay datos por área" />
        ) : (
          <div className="w-full rounded-xl bg-muted/40 p-3">
            <div style={{ height: Math.max(sorted.length * 48 + 40, 220) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={sorted}
                  layout="vertical"
                  margin={{ left: 8, right: 24, top: 8, bottom: 8 }}
                  barCategoryGap="22%"
                >
                  <CartesianGrid
                    strokeDasharray="3 4"
                    stroke="hsl(var(--border))"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="area"
                    stroke="hsl(var(--foreground))"
                    fontSize={12}
                    fontWeight={600}
                    tickLine={false}
                    axisLine={false}
                    width={170}
                    interval={0}
                  />
                  <Tooltip
                    cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
                    contentStyle={TOOLTIP_STYLE}
                  />
                  {AREA_STATUSES.map((s) => (
                    <Bar
                      key={s}
                      dataKey={s}
                      name={s}
                      stackId="part"
                      fill={PARTICIPATION_COLORS[s]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// 3) Barras por área — cantidad de "Aun No Participa" en un evento
// ============================================================================
export interface AreaCountRow {
  area: string;
  value: number;
  names: string[];
}

export function AunNoParticipaByAreaChart({
  data,
  eventName,
}: {
  data: AreaCountRow[];
  eventName: string;
}) {
  const sorted = [...data].sort((a, b) => b.value - a.value);
  const max = Math.max(...sorted.map((d) => d.value), 1);
  const xMax = Math.ceil(max * 1.18) + 1;
  const total = sorted.reduce((acc, d) => acc + d.value, 0);
  const color = PARTICIPATION_COLORS['Aun No Participa'];

  const [selectedArea, setSelectedArea] = React.useState<string | null>(null);
  const selected = sorted.find((d) => d.area === selectedArea) || null;

  function handleBarClick(payload: any) {
    const area = payload?.area as string | undefined;
    if (!area) return;
    setSelectedArea((prev) => (prev === area ? null : area));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Aún no participa · {eventName}</CardTitle>
        <CardDescription>
          Colaboradores activos que aún no participan, por área · {total} en total ·
          tocá un área para ver los nombres
        </CardDescription>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <EmptyState text={`Todos los activos ya tienen estado en "${eventName}"`} />
        ) : (
          <>
            <div className="w-full rounded-xl bg-muted/40 p-3">
              <div style={{ height: Math.max(sorted.length * 44 + 40, 220) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={sorted}
                    layout="vertical"
                    margin={{ left: 8, right: 32, top: 8, bottom: 8 }}
                    barCategoryGap="22%"
                    onClick={(state: any) =>
                      handleBarClick(state?.activePayload?.[0]?.payload)
                    }
                  >
                    <defs>
                      <linearGradient id="anp-grad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor={color} stopOpacity={0.55} />
                        <stop offset="100%" stopColor={color} stopOpacity={1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 4"
                      stroke="hsl(var(--border))"
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                      domain={[0, xMax]}
                    />
                    <YAxis
                      type="category"
                      dataKey="area"
                      stroke="hsl(var(--foreground))"
                      fontSize={12}
                      fontWeight={600}
                      tickLine={false}
                      axisLine={false}
                      width={170}
                      interval={0}
                    />
                    <Tooltip
                      cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
                      contentStyle={TOOLTIP_STYLE}
                      formatter={(v: any) => [`${v} colaborador${Number(v) === 1 ? '' : 'es'}`, 'Aún no participa']}
                    />
                    <Bar
                      dataKey="value"
                      radius={[0, 10, 10, 0]}
                      minPointSize={3}
                      fill="url(#anp-grad)"
                      cursor="pointer"
                    >
                      <LabelList
                        dataKey="value"
                        position="right"
                        fontSize={13}
                        fontWeight={800}
                        fill="hsl(var(--foreground))"
                        offset={8}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Panel de nombres del área seleccionada */}
            {selected && (
              <div className="mt-4 rounded-xl border border-border bg-muted/30 p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-foreground">
                    {selected.area}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      {selected.value} aún no participa{selected.value === 1 ? '' : 'n'}
                    </span>
                  </p>
                  <button
                    type="button"
                    onClick={() => setSelectedArea(null)}
                    className="text-xs font-medium text-muted-foreground hover:text-foreground"
                  >
                    Cerrar
                  </button>
                </div>
                <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {selected.names.map((n) => (
                    <li
                      key={n}
                      className="flex items-center gap-2 rounded-lg bg-background/60 px-2.5 py-1.5 text-sm text-foreground"
                    >
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ background: color }}
                      />
                      <span className="truncate" title={n}>
                        {n}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// 4) Barras por persona — cantidad de eventos en los que NO participó
// ============================================================================
export interface PersonCountRow {
  name: string;
  area: string;
  value: number;     // cantidad de eventos con "No Participo"
  events: string[];  // nombres de los eventos a los que no fue
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

export function NoParticipoByPersonChart({ data }: { data: PersonCountRow[] }) {
  const sorted = [...data].sort((a, b) => b.value - a.value);
  const max = Math.max(...sorted.map((d) => d.value), 1);
  const xMax = Math.ceil(max * 1.18) + 1;
  const total = sorted.reduce((acc, d) => acc + d.value, 0);
  const color = PARTICIPATION_COLORS['No Participo'];

  const [selectedName, setSelectedName] = React.useState<string | null>(null);
  const selected = sorted.find((d) => d.name === selectedName) || null;

  function handleBarClick(payload: any) {
    const name = payload?.name as string | undefined;
    if (!name) return;
    setSelectedName((prev) => (prev === name ? null : name));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inasistencias</CardTitle>
        <CardDescription>
          Cantidad de eventos en los que cada colaborador activo marcó "No Participo" ·{' '}
          {total} en total · tocá una barra para ver de qué eventos se trata
        </CardDescription>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <EmptyState text='Ningún colaborador activo tiene eventos con "No Participo"' />
        ) : (
          <>
            <div className="w-full rounded-xl bg-muted/40 p-3">
              <div style={{ height: Math.max(sorted.length * 38 + 40, 220) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={sorted}
                    layout="vertical"
                    margin={{ left: 8, right: 32, top: 8, bottom: 8 }}
                    barCategoryGap="20%"
                    onClick={(state: any) =>
                      handleBarClick(state?.activePayload?.[0]?.payload)
                    }
                  >
                    <defs>
                      <linearGradient id="nopart-grad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor={color} stopOpacity={0.55} />
                        <stop offset="100%" stopColor={color} stopOpacity={1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 4"
                      stroke="hsl(var(--border))"
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                      domain={[0, xMax]}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      stroke="hsl(var(--foreground))"
                      fontSize={12}
                      fontWeight={600}
                      tickLine={false}
                      axisLine={false}
                      width={170}
                      interval={0}
                      tickFormatter={(v: string) => truncate(v, 22)}
                    />
                    <Tooltip
                      cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
                      contentStyle={TOOLTIP_STYLE}
                      formatter={(v: any) => [
                        `${v} evento${Number(v) === 1 ? '' : 's'} sin participar`,
                        'No participó',
                      ]}
                    />
                    <Bar
                      dataKey="value"
                      radius={[0, 10, 10, 0]}
                      minPointSize={3}
                      fill="url(#nopart-grad)"
                      cursor="pointer"
                    >
                      <LabelList
                        dataKey="value"
                        position="right"
                        fontSize={13}
                        fontWeight={800}
                        fill="hsl(var(--foreground))"
                        offset={8}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Panel de eventos de la persona seleccionada */}
            {selected && (
              <div className="mt-4 rounded-xl border border-border bg-muted/30 p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-foreground">
                    {selected.name}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      {selected.area} · no participó en {selected.value} evento
                      {selected.value === 1 ? '' : 's'}
                    </span>
                  </p>
                  <button
                    type="button"
                    onClick={() => setSelectedName(null)}
                    className="text-xs font-medium text-muted-foreground hover:text-foreground"
                  >
                    Cerrar
                  </button>
                </div>
                <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {selected.events.map((n) => (
                    <li
                      key={n}
                      className="flex items-center gap-2 rounded-lg bg-background/60 px-2.5 py-1.5 text-sm text-foreground"
                    >
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ background: color }}
                      />
                      <span className="truncate" title={n}>
                        {n}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex h-32 flex-col items-center justify-center rounded-xl bg-muted/40 p-6 text-center">
      <p className="text-sm font-medium text-muted-foreground">{text}</p>
    </div>
  );
}
