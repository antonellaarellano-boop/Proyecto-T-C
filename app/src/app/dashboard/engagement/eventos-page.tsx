'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  CalendarHeart,
  CheckCheck,
  ChevronDown,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown';
import {
  EMPLOYEE_STATUSES,
  EMPLOYEE_STATUS_COLORS,
  PARTICIPATION_STATUSES,
  PARTICIPATION_COLORS,
  type EmployeeStatus,
  type EngagementEvent,
  type EngagementParticipant,
  type ParticipationStatus,
} from '@/lib/types';
import { useCanMutate, useIsAdmin } from '@/components/auth/role-context';
import { cn } from '@/lib/utils';

interface Props {
  initialEvents: EngagementEvent[];
  initialParticipants: EngagementParticipant[];
  areaOptions: string[];
}

const DEFAULT_PARTICIPATION: ParticipationStatus = 'Aun No Participa';

function eventDateFmt(iso?: string): string {
  if (!iso) return '';
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

export function EventosPage({
  initialEvents,
  initialParticipants,
  areaOptions,
}: Props) {
  const router = useRouter();
  const canMutate = useCanMutate();
  const isAdmin = useIsAdmin();

  const [events, setEvents] = React.useState(initialEvents);
  const [participants, setParticipants] = React.useState(initialParticipants);
  React.useEffect(() => setEvents(initialEvents), [initialEvents]);
  React.useEffect(() => setParticipants(initialParticipants), [initialParticipants]);

  const [search, setSearch] = React.useState('');
  const [tab, setTab] = React.useState<'activos' | 'cese'>('activos');

  // Evento seleccionado: la matriz muestra UNA sola columna de evento a la vez.
  const [selectedEventId, setSelectedEventId] = React.useState<string | null>(
    initialEvents[0]?.id ?? null,
  );
  // Mantiene la selección válida al crear/eliminar eventos (cae al primero).
  React.useEffect(() => {
    if (events.length === 0) {
      setSelectedEventId(null);
    } else if (!selectedEventId || !events.some((e) => e.id === selectedEventId)) {
      setSelectedEventId(events[0].id);
    }
  }, [events, selectedEventId]);
  const selectedEvent = events.find((e) => e.id === selectedEventId) || null;

  const [creatingEvent, setCreatingEvent] = React.useState(false);
  const [editingEvent, setEditingEvent] = React.useState<EngagementEvent | null>(null);
  const [confirmDeleteEvent, setConfirmDeleteEvent] =
    React.useState<EngagementEvent | null>(null);
  const [confirmMarkAll, setConfirmMarkAll] = React.useState(false);

  // Número correlativo estable por colaborador (posición en la lista completa).
  const ordinalById = React.useMemo(() => {
    const m = new Map<string, number>();
    participants.forEach((p, i) => m.set(p.id, i + 1));
    return m;
  }, [participants]);

  // Conteos por tab (respetan la búsqueda pero NO el tab activo).
  const tabCounts = React.useMemo(() => {
    const q = search.toLowerCase().trim();
    let activos = 0;
    let cese = 0;
    for (const p of participants) {
      if (q && !p.name.toLowerCase().includes(q)) continue;
      if (p.status === 'Cese') cese += 1;
      else activos += 1;
    }
    return { activos, cese };
  }, [participants, search]);

  const filtered = React.useMemo(() => {
    const q = search.toLowerCase().trim();
    return participants.filter((p) => {
      if (tab === 'activos' && p.status === 'Cese') return false;
      if (tab === 'cese' && p.status !== 'Cese') return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q);
    });
  }, [participants, search, tab]);

  // ---- Stats ----
  const activos = participants.filter((p) => p.status === 'Activo').length;

  // ---- Mutaciones ----
  // status '' = dejar en blanco (sin marca para ese evento).
  async function setParticipation(
    participant: EngagementParticipant,
    eventId: string,
    status: ParticipationStatus | '',
  ) {
    if ((participant.participation[eventId] || '') === status) return;
    const prev = participants;
    setParticipants((arr) =>
      arr.map((p) => {
        if (p.id !== participant.id) return p;
        const nextPart = { ...p.participation };
        if (status === '') delete nextPart[eventId];
        else nextPart[eventId] = status;
        return { ...p, participation: nextPart };
      }),
    );
    try {
      const res = await fetch(`/api/engagement/participants/${participant.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participation: { [eventId]: status } }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as any).error || 'Error');
      }
    } catch (err: any) {
      setParticipants(prev);
      toast.error(err.message || 'No se pudo actualizar');
    }
  }

  // Marca como "Participo" a todos los colaboradores visibles en el evento activo.
  async function markAllParticipo() {
    setConfirmMarkAll(false);
    if (!selectedEvent) return;
    const eid = selectedEvent.id;
    const targets = filtered.filter(
      (p) => (p.participation[eid] || DEFAULT_PARTICIPATION) !== 'Participo',
    );
    if (targets.length === 0) {
      toast.success('Todos ya estaban en Participó');
      return;
    }
    const ids = new Set(targets.map((t) => t.id));
    const prev = participants;
    setParticipants((arr) =>
      arr.map((p) =>
        ids.has(p.id)
          ? { ...p, participation: { ...p.participation, [eid]: 'Participo' } }
          : p,
      ),
    );
    try {
      await Promise.all(
        targets.map((p) =>
          fetch(`/api/engagement/participants/${p.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ participation: { [eid]: 'Participo' } }),
          }).then((r) => {
            if (!r.ok) throw new Error('Error');
          }),
        ),
      );
      toast.success(`${targets.length} marcados como Participó`);
      router.refresh();
    } catch {
      setParticipants(prev);
      toast.error('No se pudieron actualizar todos');
    }
  }

  async function handleDeleteEvent() {
    if (!confirmDeleteEvent) return;
    const id = confirmDeleteEvent.id;
    setConfirmDeleteEvent(null);
    const prevEvents = events;
    setEvents((arr) => arr.filter((e) => e.id !== id));
    try {
      const res = await fetch(`/api/engagement/events/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error');
      toast.success('Evento eliminado');
      router.refresh();
    } catch (err: any) {
      setEvents(prevEvents);
      toast.error('No se pudo eliminar');
    }
  }

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Eventos</h1>
          <p className="text-sm text-muted-foreground">
            Participación de colaboradores en iniciativas de cultura · editable
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:max-w-md">
          <StatCard
            label="Colaboradores activos"
            value={String(activos)}
            color={EMPLOYEE_STATUS_COLORS.Activo}
          />
          <StatCard label="Eventos" value={String(events.length)} />
        </div>

        {/* Barra de filtros por evento — muestra una sola columna a la vez */}
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Evento
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {events.map((ev) => {
              const active = ev.id === selectedEventId;
              return (
                <div
                  key={ev.id}
                  className={cn(
                    'inline-flex items-center rounded-full border transition',
                    active
                      ? 'border-brand-gold-400 bg-brand-gold-100 text-brand-gold-700 shadow-soft dark:border-brand-gold-500 dark:bg-brand-gold-600/25 dark:text-brand-gold-100'
                      : 'border-border bg-card text-muted-foreground hover:border-brand-blue-200 hover:text-foreground',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedEventId(ev.id)}
                    aria-pressed={active}
                    className={cn(
                      'flex flex-col py-1.5 text-xs font-semibold uppercase tracking-wide',
                      canMutate && active ? 'pl-4 pr-1.5' : 'px-4',
                    )}
                  >
                    <span>{ev.name}</span>
                    {ev.date && (
                      <span className="text-[9px] font-normal normal-case tracking-normal opacity-70">
                        {eventDateFmt(ev.date)}
                      </span>
                    )}
                  </button>
                  {canMutate && active && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="mr-1 rounded-full p-1 hover:bg-black/5 dark:hover:bg-white/10"
                          aria-label="Opciones del evento"
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => setEditingEvent(ev)}>
                          <Pencil className="h-3.5 w-3.5" />
                          Renombrar evento
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onSelect={() => setConfirmDeleteEvent(ev)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Eliminar evento
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              );
            })}
            {canMutate && (
              <Button
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => setCreatingEvent(true)}
              >
                <Plus className="h-4 w-4" />
                Evento
              </Button>
            )}
            {events.length === 0 && (
              <span className="text-sm text-muted-foreground">
                No hay eventos. Creá uno con "+ Evento".
              </span>
            )}
          </div>
        </div>

        {/* Tabs: Activos / Cese */}
        <div className="inline-flex rounded-xl border border-border bg-muted/40 p-1">
          <button
            type="button"
            onClick={() => setTab('activos')}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-semibold transition ${
              tab === 'activos'
                ? 'bg-card text-foreground shadow-soft'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Activos
            <span
              className={`rounded-full px-1.5 text-xs tabular-nums ${
                tab === 'activos'
                  ? 'bg-brand-aqua-100 text-brand-aqua-700 dark:bg-brand-aqua-600/30 dark:text-brand-aqua-100'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {tabCounts.activos}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setTab('cese')}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-semibold transition ${
              tab === 'cese'
                ? 'bg-card text-foreground shadow-soft'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Cese
            <span
              className={`rounded-full px-1.5 text-xs tabular-nums ${
                tab === 'cese'
                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-600/30 dark:text-rose-100'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {tabCounts.cese}
            </span>
          </button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <div className="shrink-0 rounded-xl bg-brand-blue-100 p-2 text-brand-blue-700 dark:bg-brand-blue-600/20 dark:text-brand-blue-100">
                  <CalendarHeart className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <CardTitle>Matriz de participación</CardTitle>
                  <CardDescription>
                    Tocá una celda para cambiar la participación · los datos del colaborador se editan en Colaboradores
                  </CardDescription>
                </div>
              </div>
              <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto">
                <div className="relative min-w-0 flex-1 lg:w-56 lg:flex-none">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar colaborador..."
                    className="pl-9"
                  />
                </div>
                {canMutate && selectedEvent && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => setConfirmMarkAll(true)}
                    disabled={filtered.length === 0}
                  >
                    <CheckCheck className="h-4 w-4" />
                    Todos: Participó
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {filtered.length === 0 ? (
              <div className="flex h-32 flex-col items-center justify-center rounded-xl bg-muted/40 p-6 text-center">
                <p className="text-sm font-medium text-muted-foreground">
                  No hay colaboradores para mostrar
                </p>
                <p className="mt-1 text-xs text-muted-foreground/70">
                  Agregá uno con el botón "Colaborador" o ajustá los filtros.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-muted/40 text-left">
                      <th className="w-10 px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        #
                      </th>
                      <th className="w-24 px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Status
                      </th>
                      <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Area
                      </th>
                      <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Nombres Completos
                      </th>
                      {selectedEvent && (
                        <th
                          key={selectedEvent.id}
                          className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                        >
                          <div className="flex flex-col items-center gap-0.5">
                            <div className="flex items-center justify-center gap-1">
                              <span className="whitespace-nowrap">{selectedEvent.name}</span>
                            {canMutate && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    className="rounded p-0.5 text-muted-foreground/60 hover:bg-muted hover:text-foreground"
                                    aria-label="Opciones del evento"
                                  >
                                    <ChevronDown className="h-3.5 w-3.5" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onSelect={() => setEditingEvent(selectedEvent)}>
                                    <Pencil className="h-3.5 w-3.5" />
                                    Renombrar evento
                                  </DropdownMenuItem>
                                  {isAdmin && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        className="text-destructive focus:text-destructive"
                                        onSelect={() => setConfirmDeleteEvent(selectedEvent)}
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                        Eliminar evento
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                            </div>
                            {selectedEvent.date && (
                              <span className="text-[9px] font-normal normal-case text-muted-foreground">
                                {eventDateFmt(selectedEvent.date)}
                              </span>
                            )}
                          </div>
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p, i) => (
                      <motion.tr
                        key={p.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(i * 0.015, 0.2) }}
                        className="border-t border-border transition-colors hover:bg-muted/30"
                      >
                        <td className="px-3 py-2 text-center text-xs font-medium tabular-nums text-muted-foreground">
                          {ordinalById.get(p.id)}
                        </td>
                        <td className="px-3 py-2">
                          <StatusBadge status={p.status} editable={false} onChange={() => {}} />
                        </td>
                        <td className="px-3 py-2">
                          <AreaCell
                            area={p.area}
                            options={areaOptions}
                            editable={false}
                            onChange={() => {}}
                          />
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 font-medium text-foreground">
                          {p.name}
                        </td>
                        {selectedEvent && (
                          <td key={selectedEvent.id} className="px-3 py-2 text-center">
                            <ParticipationCell
                              status={p.participation[selectedEvent.id] || undefined}
                              editable={canMutate}
                              onChange={(s) => setParticipation(p, selectedEvent.id, s)}
                            />
                          </td>
                        )}
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Crear evento */}
      <EventFormDialog
        open={creatingEvent}
        onOpenChange={setCreatingEvent}
        onSubmitted={(item) => {
          setEvents((arr) => [...arr, item]);
          router.refresh();
        }}
      />

      {/* Editar evento */}
      <EventFormDialog
        open={!!editingEvent}
        onOpenChange={(v) => !v && setEditingEvent(null)}
        event={editingEvent || undefined}
        onSubmitted={(item) => {
          setEvents((arr) => arr.map((x) => (x.id === item.id ? item : x)));
          setEditingEvent(null);
          router.refresh();
        }}
      />

      {/* Confirmar marcar todos como Participó */}
      <Dialog open={confirmMarkAll} onOpenChange={setConfirmMarkAll}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Marcar todos como Participó</DialogTitle>
            <DialogDescription>
              Se marcará como <span className="font-semibold text-foreground">Participó</span>{' '}
              a los {filtered.length} colaboradores visibles (
              {tab === 'activos' ? 'Activos' : 'Cese'}) en{' '}
              <span className="font-semibold text-foreground">{selectedEvent?.name}</span>.
              Podés cambiarlos individualmente después.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmMarkAll(false)}>
              Cancelar
            </Button>
            <Button variant="gradient" onClick={markAllParticipo}>
              <CheckCheck className="h-4 w-4" />
              Marcar todos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmar eliminar evento */}
      <Dialog
        open={!!confirmDeleteEvent}
        onOpenChange={(v) => !v && setConfirmDeleteEvent(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar evento</DialogTitle>
            <DialogDescription>
              ¿Seguro que querés eliminar el evento{' '}
              <span className="font-semibold text-foreground">
                {confirmDeleteEvent?.name}
              </span>
              ? Se borrará la participación registrada de todos los colaboradores
              en este evento.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteEvent(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteEvent}>
              <Trash2 className="h-4 w-4" />
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ============================================================================
// Subcomponentes
// ============================================================================
function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card">
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

function StatusBadge({
  status,
  editable,
  onChange,
}: {
  status: EmployeeStatus;
  editable: boolean;
  onChange: (s: EmployeeStatus) => void;
}) {
  const color = EMPLOYEE_STATUS_COLORS[status];
  const badge = (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
        editable && 'cursor-pointer',
      )}
      style={{ background: `${color}1A`, color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {status}
    </span>
  );

  if (!editable) return badge;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button aria-label="Cambiar status">{badge}</button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>Status</DropdownMenuLabel>
        {EMPLOYEE_STATUSES.map((s) => (
          <DropdownMenuItem key={s} onSelect={() => onChange(s)}>
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: EMPLOYEE_STATUS_COLORS[s] }}
            />
            {s}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AreaCell({
  area,
  options,
  editable,
  onChange,
}: {
  area?: string;
  options: string[];
  editable: boolean;
  onChange: (a: string) => void;
}) {
  const label = (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-0.5 text-xs',
        area ? 'text-foreground' : 'text-muted-foreground',
        editable && 'cursor-pointer hover:bg-muted',
      )}
    >
      {area || '—'}
      {editable && <ChevronDown className="h-3 w-3 text-muted-foreground/60" />}
    </span>
  );

  if (!editable) return label;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button aria-label="Cambiar área">{label}</button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto">
        <DropdownMenuLabel>Área</DropdownMenuLabel>
        {options.map((a) => (
          <DropdownMenuItem key={a} onSelect={() => onChange(a)}>
            {a}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ParticipationCell({
  status,
  editable,
  onChange,
}: {
  status?: ParticipationStatus;
  editable: boolean;
  onChange: (s: ParticipationStatus | '') => void;
}) {
  const color = status ? PARTICIPATION_COLORS[status] : undefined;
  const badge = status ? (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
        editable && 'cursor-pointer hover:ring-1 hover:ring-border',
      )}
      style={{ background: `${color}1A`, color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {status}
    </span>
  ) : (
    // Sin marca (ej. colaborador agregado después del evento). En blanco.
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-dashed border-border px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground',
        editable && 'cursor-pointer hover:text-foreground hover:border-brand-blue-200',
      )}
    >
      {editable ? '+ Marcar' : '—'}
    </span>
  );

  if (!editable) return badge;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button aria-label="Cambiar participación">{badge}</button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center">
        <DropdownMenuLabel>Participación</DropdownMenuLabel>
        {PARTICIPATION_STATUSES.map((s) => (
          <DropdownMenuItem key={s} onSelect={() => onChange(s)}>
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: PARTICIPATION_COLORS[s] }}
            />
            {s}
          </DropdownMenuItem>
        ))}
        {status && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onChange('')}>
              <span className="h-2 w-2 rounded-full border border-dashed border-muted-foreground" />
              Dejar en blanco
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ============================================================================
// Modal evento
// ============================================================================
function EventFormDialog({
  open,
  onOpenChange,
  event,
  onSubmitted,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  event?: EngagementEvent;
  onSubmitted: (item: EngagementEvent) => void;
}) {
  const isEdit = !!event;
  const [loading, setLoading] = React.useState(false);
  const [name, setName] = React.useState(event?.name || '');
  const [date, setDate] = React.useState(event?.date || '');

  React.useEffect(() => {
    if (!open) return;
    setName(event?.name || '');
    setDate(event?.date || '');
  }, [open, event]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return toast.error('Ingresá el nombre del evento');
    setLoading(true);
    try {
      const url = isEdit
        ? `/api/engagement/events/${event!.id}`
        : '/api/engagement/events';
      const res = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), date: date || null }),
      });
      const json = await res.json().catch(() => ({ error: `Error ${res.status}` }));
      if (!res.ok) throw new Error((json as any).error || 'Error');
      onSubmitted((json as any).data);
      toast.success(isEdit ? 'Evento actualizado' : 'Evento creado');
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'No se pudo guardar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Renombrar evento' : 'Nuevo evento'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Cambiá el nombre o la fecha del evento.'
              : 'Agregá una nueva columna de evento a la matriz.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nombre del evento</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Aniversario Baldecash"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label>Fecha (opcional)</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="gradient" disabled={loading}>
              {isEdit ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {isEdit ? 'Guardar' : 'Crear'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
