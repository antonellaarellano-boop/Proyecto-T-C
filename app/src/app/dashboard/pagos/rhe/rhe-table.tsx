'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { CalendarClock, Receipt, Pencil, Plus, Search, Trash2 } from 'lucide-react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DEFAULT_PAYMENT_STATUS,
  EMPLOYEE_STATUSES,
  EMPLOYEE_STATUS_COLORS,
  PAYMENT_MONTHS,
  PAYMENT_STATUSES,
  PAYMENT_STATUS_COLORS,
  type EmployeeStatus,
  type PaymentStatus,
  type RheEntry,
} from '@/lib/types';
import { useCanMutate } from '@/components/auth/role-context';
import { cn } from '@/lib/utils';
import { PaymentsCharts } from '@/components/dashboard/payments-charts';
import { AutoMonthsDialog } from '@/components/dashboard/auto-months-dialog';
import { PaymentExecutionSchedule } from '@/components/dashboard/payment-execution-schedule';

const pad2 = (n: number) => String(n).padStart(2, '0');
function localNowInput(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(
    d.getHours(),
  )}:${pad2(d.getMinutes())}`;
}
function toDateTimeInput(s?: string): string {
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return `${s}T00:00`;
  return s.slice(0, 16);
}
function formatISODate(iso?: string): string {
  if (!iso) return '—';
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

export function RheTable({ initialEntries }: { initialEntries: RheEntry[] }) {
  const router = useRouter();
  const canMutate = useCanMutate();

  const [entries, setEntries] = React.useState(initialEntries);
  React.useEffect(() => setEntries(initialEntries), [initialEntries]);

  const [search, setSearch] = React.useState('');
  const currentMonthKey = PAYMENT_MONTHS[new Date().getMonth()]?.key ?? 'ene';
  const [selectedMonth, setSelectedMonth] = React.useState<string>(currentMonthKey);
  const [statusTab, setStatusTab] = React.useState<
    'pendiente' | 'programado' | 'listo' | 'todos'
  >('pendiente');

  const [creating, setCreating] = React.useState(false);
  const [editing, setEditing] = React.useState<RheEntry | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState<RheEntry | null>(null);
  const [autoFor, setAutoFor] = React.useState<RheEntry | null>(null);

  const selectedMonthInfo =
    PAYMENT_MONTHS.find((m) => m.key === selectedMonth) || PAYMENT_MONTHS[0];

  const ordinalById = React.useMemo(() => {
    const m = new Map<string, number>();
    entries.forEach((e, i) => m.set(e.id, i + 1));
    return m;
  }, [entries]);

  const searched = React.useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return entries;
    return entries.filter((e) =>
      `${e.person} ${e.contact || ''} ${e.area || ''} ${e.partida || ''} ${e.entity || ''}`
        .toLowerCase()
        .includes(q),
    );
  }, [entries, search]);

  const statusOf = React.useCallback(
    (e: RheEntry) => e.status[selectedMonth] || DEFAULT_PAYMENT_STATUS,
    [selectedMonth],
  );

  // "Listo" agrupa los ya resueltos: Listo + Automático + No se realizó.
  const isClosed = React.useCallback(
    (e: RheEntry) => {
      const s = statusOf(e);
      return s === 'Listo' || s === 'Automatico' || s === 'No se realizo';
    },
    [statusOf],
  );

  const tabCounts = React.useMemo(() => {
    let pendiente = 0;
    let programado = 0;
    let listo = 0;
    for (const e of searched) {
      const s = statusOf(e);
      if (s === 'Pendiente') pendiente += 1;
      else if (s === 'Programado') programado += 1;
      else if (s === 'Listo' || s === 'Automatico' || s === 'No se realizo') listo += 1;
    }
    return { pendiente, programado, listo, todos: searched.length };
  }, [searched, statusOf]);

  const filtered = React.useMemo(() => {
    if (statusTab === 'pendiente')
      return searched.filter((e) => statusOf(e) === 'Pendiente');
    if (statusTab === 'programado')
      return searched.filter((e) => statusOf(e) === 'Programado');
    if (statusTab === 'listo') return searched.filter((e) => isClosed(e));
    return searched;
  }, [searched, statusTab, statusOf, isClosed]);

  const monthStats = React.useMemo(() => {
    const counts: Record<string, number> = {};
    PAYMENT_STATUSES.forEach((s) => (counts[s] = 0));
    for (const e of entries) {
      const s = e.status[selectedMonth] || DEFAULT_PAYMENT_STATUS;
      counts[s] = (counts[s] || 0) + 1;
    }
    return counts;
  }, [entries, selectedMonth]);

  // Programados del mes: se basa en TENER fecha de programación guardada (no en el
  // status actual) → no desaparecen al cambiar de estado; se quitan manualmente.
  const programados = React.useMemo(
    () =>
      entries
        .filter((e) => !!e.scheduledAt?.[selectedMonth])
        .map((e) => ({
          id: e.id,
          name: e.person,
          paymentDate: e.paymentDate,
          scheduledAt: e.scheduledAt?.[selectedMonth],
          paidAt: e.paidAt?.[selectedMonth],
          status: e.status[selectedMonth] || DEFAULT_PAYMENT_STATUS,
        })),
    [entries, selectedMonth],
  );

  // Mutación genérica de un campo (mes o personStatus) con update optimista.
  async function patchEntry(entry: RheEntry, body: any, optimistic: (e: RheEntry) => RheEntry) {
    const prev = entries;
    setEntries((arr) => arr.map((e) => (e.id === entry.id ? optimistic(e) : e)));
    try {
      const res = await fetch(`/api/rhe/${entry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as any).error || 'Error');
      }
    } catch (err: any) {
      setEntries(prev);
      toast.error(err.message || 'No se pudo actualizar');
    }
  }

  function setMonthStatus(entry: RheEntry, status: PaymentStatus) {
    if ((entry.status[selectedMonth] || DEFAULT_PAYMENT_STATUS) === status) return;
    // Al marcar "Programado" se registra la fecha/hora en que se eligió.
    const scheduledAt =
      status === 'Programado'
        ? { ...(entry.scheduledAt || {}), [selectedMonth]: localNowInput() }
        : entry.scheduledAt;
    const body =
      status === 'Programado'
        ? { status: { [selectedMonth]: status }, scheduledAt }
        : { status: { [selectedMonth]: status } };
    patchEntry(entry, body, (e) => ({
      ...e,
      status: { ...e.status, [selectedMonth]: status },
      scheduledAt,
    }));
  }

  // Edita la fecha en que se programó (mes seleccionado) de una persona.
  function setScheduledDate(entryId: string, iso: string) {
    const entry = entries.find((e) => e.id === entryId);
    if (!entry) return;
    const newScheduled = { ...(entry.scheduledAt || {}), [selectedMonth]: iso };
    patchEntry(entry, { scheduledAt: newScheduled }, (e) => ({
      ...e,
      scheduledAt: newScheduled,
    }));
  }

  // Registra/edita la fecha REAL en que se pagó (mes seleccionado). '' la borra.
  function setPaidDate(entryId: string, iso: string) {
    const entry = entries.find((e) => e.id === entryId);
    if (!entry) return;
    const newPaid = { ...(entry.paidAt || {}) };
    if (iso) newPaid[selectedMonth] = iso;
    else delete newPaid[selectedMonth];
    patchEntry(entry, { paidAt: newPaid }, (e) => ({ ...e, paidAt: newPaid }));
  }

  // Quita manualmente una persona de la lista de Programados del mes (borra su fecha).
  function removeFromProgramados(entryId: string) {
    const entry = entries.find((e) => e.id === entryId);
    if (!entry) return;
    const { [selectedMonth]: _omit, ...rest } = entry.scheduledAt || {};
    patchEntry(entry, { scheduledAt: rest }, (e) => ({ ...e, scheduledAt: rest }));
  }

  function setPersonStatus(entry: RheEntry, personStatus: EmployeeStatus) {
    if (entry.personStatus === personStatus) return;
    patchEntry(entry, { personStatus }, (e) => ({ ...e, personStatus }));
  }

  // Aplica/revierte "Automatico" en varios meses de una persona.
  function applyAuto(entry: RheEntry, patch: Record<string, PaymentStatus>) {
    if (Object.keys(patch).length === 0) return;
    patchEntry(entry, { status: patch }, (e) => ({
      ...e,
      status: { ...e.status, ...patch },
    }));
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    const id = confirmDelete.id;
    setConfirmDelete(null);
    const prev = entries;
    setEntries((arr) => arr.filter((e) => e.id !== id));
    try {
      const res = await fetch(`/api/rhe/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error');
      toast.success('RHE eliminado');
      router.refresh();
    } catch {
      setEntries(prev);
      toast.error('No se pudo eliminar');
    }
  }

  return (
    <>
      {/* Resumen del mes seleccionado */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {PAYMENT_STATUSES.map((s) => (
          <StatCard
            key={s}
            label={s}
            value={String(monthStats[s] || 0)}
            color={PAYMENT_STATUS_COLORS[s]}
          />
        ))}
      </div>

      {/* Barra de filtros por mes */}
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Mes
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {PAYMENT_MONTHS.map((m) => {
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
          })}
        </div>
      </div>

      {/* Gráficos de decisión (reutiliza los de pagos) */}
      <PaymentsCharts
        payments={entries}
        selectedMonth={selectedMonth}
        onSelectMonth={setSelectedMonth}
      />

      {/* Pestañas por estado del mes */}
      <div className="inline-flex flex-wrap rounded-xl border border-border bg-muted/40 p-1">
        {(
          [
            { key: 'pendiente', label: 'Pendiente', count: tabCounts.pendiente, tone: 'rose' },
            { key: 'programado', label: 'Programado', count: tabCounts.programado, tone: 'violet' },
            { key: 'listo', label: 'Listo', count: tabCounts.listo, tone: 'green' },
            { key: 'todos', label: 'Todos', count: tabCounts.todos, tone: 'neutral' },
          ] as const
        ).map((t) => {
          const active = statusTab === t.key;
          const badgeTone =
            active && t.tone === 'rose'
              ? 'bg-rose-100 text-rose-700 dark:bg-rose-600/30 dark:text-rose-100'
              : active && t.tone === 'violet'
                ? 'bg-violet-100 text-violet-700 dark:bg-violet-600/30 dark:text-violet-100'
                : active && t.tone === 'green'
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-600/30 dark:text-emerald-100'
                  : active
                    ? 'bg-brand-blue-100 text-brand-blue-700 dark:bg-brand-blue-600/30 dark:text-brand-blue-100'
                    : 'bg-muted text-muted-foreground';
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setStatusTab(t.key)}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-semibold transition',
                active
                  ? 'bg-card text-foreground shadow-soft'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t.label}
              <span className={cn('rounded-full px-1.5 text-xs tabular-nums', badgeTone)}>
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="shrink-0 rounded-xl bg-brand-blue-100 p-2 text-brand-blue-700 dark:bg-brand-blue-600/20 dark:text-brand-blue-100">
                <Receipt className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <CardTitle>RHE · {selectedMonthInfo.full}</CardTitle>
                <CardDescription>
                  Tocá la celda del mes para cambiar el estado de pago · por defecto Pendiente
                </CardDescription>
              </div>
            </div>
            <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto">
              <div className="relative min-w-0 flex-1 lg:w-56 lg:flex-none">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar persona, área..."
                  className="pl-9"
                />
              </div>
              {canMutate && (
                <Button
                  variant="gradient"
                  size="sm"
                  className="shrink-0"
                  onClick={() => setCreating(true)}
                >
                  <Plus className="h-4 w-4" />
                  RHE
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {filtered.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center rounded-xl bg-muted/40 p-6 text-center">
              {statusTab === 'pendiente' && entries.length > 0 && !search ? (
                <>
                  <p className="text-sm font-medium text-foreground">
                    ¡Sin pendientes en {selectedMonthInfo.full}! 🎉
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground/70">
                    Ningún RHE quedó pendiente. Mirá "Programado" o "Listo".
                  </p>
                </>
              ) : statusTab === 'programado' ? (
                <p className="text-sm font-medium text-muted-foreground">
                  No hay RHE programados en {selectedMonthInfo.full}
                </p>
              ) : statusTab === 'listo' ? (
                <p className="text-sm font-medium text-muted-foreground">
                  Todavía no hay RHE cerrados (Listo / No se realizó) en{' '}
                  {selectedMonthInfo.full}
                </p>
              ) : (
                <>
                  <p className="text-sm font-medium text-muted-foreground">
                    No hay registros para mostrar
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground/70">
                    Agregá uno con el botón "RHE" o ajustá la búsqueda.
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[980px] border-collapse text-sm">
                <thead>
                  <tr className="bg-muted/40 text-left">
                    <Th className="w-10 text-center">#</Th>
                    <Th>Persona</Th>
                    <Th className="text-center">{selectedMonthInfo.label}</Th>
                    <Th>Status</Th>
                    <Th>Áreas</Th>
                    <Th>Partida</Th>
                    <Th>Entidad</Th>
                    <Th>Fecha de pago</Th>
                    {canMutate && <Th className="text-right">Acciones</Th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((e, i) => {
                    const status = e.status[selectedMonth] || DEFAULT_PAYMENT_STATUS;
                    return (
                      <motion.tr
                        key={e.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(i * 0.012, 0.2) }}
                        className="border-t border-border transition-colors hover:bg-muted/30"
                      >
                        <Td className="text-center text-xs font-medium tabular-nums text-muted-foreground">
                          {ordinalById.get(e.id)}
                        </Td>
                        <Td className="min-w-[220px]">
                          <p className="font-semibold text-foreground">{e.person}</p>
                          {e.contact && (
                            <p className="text-xs text-muted-foreground">{e.contact}</p>
                          )}
                        </Td>
                        <Td className="text-center">
                          <PaymentStatusCell
                            status={status}
                            editable={canMutate}
                            onChange={(s) => setMonthStatus(e, s)}
                            onManageAuto={() => setAutoFor(e)}
                          />
                        </Td>
                        <Td>
                          <PersonStatusCell
                            status={(e.personStatus as EmployeeStatus) || 'Activo'}
                            editable={canMutate}
                            onChange={(s) => setPersonStatus(e, s)}
                          />
                        </Td>
                        <Td className="whitespace-nowrap text-muted-foreground">
                          {e.area || '—'}
                        </Td>
                        <Td className="whitespace-nowrap text-muted-foreground">
                          {e.partida || '—'}
                        </Td>
                        <Td className="whitespace-nowrap text-muted-foreground">
                          {e.entity || '—'}
                        </Td>
                        <Td className="whitespace-nowrap text-muted-foreground">
                          {e.paymentDate || '—'}
                        </Td>
                        {canMutate && (
                          <Td>
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => setEditing(e)}
                                aria-label="Editar"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => setConfirmDelete(e)}
                                aria-label="Eliminar"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </Td>
                        )}
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Programados del mes + proyección de ejecución */}
      {programados.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <div className="flex min-w-0 items-start gap-3">
                <div className="shrink-0 rounded-xl bg-violet-100 p-2 text-violet-700 dark:bg-violet-600/20 dark:text-violet-100">
                  <CalendarClock className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <CardTitle>Programados de {selectedMonthInfo.full}</CardTitle>
                  <CardDescription>
                    Fecha en que se marcó cada RHE como programado
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full min-w-[520px] border-collapse text-sm">
                  <thead>
                    <tr className="bg-muted/40 text-left">
                      <Th>Persona</Th>
                      <Th>Fecha de pago</Th>
                      <Th>Programado el</Th>
                      <Th>Pagado realmente</Th>
                      <Th>Estado actual</Th>
                      {canMutate && <Th className="text-right">Quitar</Th>}
                    </tr>
                  </thead>
                  <tbody>
                    {programados.map((p) => (
                      <tr key={p.id} className="border-t border-border">
                        <Td className="font-medium text-foreground">{p.name}</Td>
                        <Td className="whitespace-nowrap text-muted-foreground">
                          {p.paymentDate || '—'}
                        </Td>
                        <Td className="whitespace-nowrap">
                          {canMutate ? (
                            <input
                              type="datetime-local"
                              value={toDateTimeInput(p.scheduledAt)}
                              onChange={(e) => setScheduledDate(p.id, e.target.value)}
                              className="h-8 rounded-lg border border-input bg-background/60 px-2 text-sm shadow-sm transition focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            />
                          ) : p.scheduledAt ? (
                            <span
                              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                              style={{
                                background: `${PAYMENT_STATUS_COLORS.Programado}1A`,
                                color: PAYMENT_STATUS_COLORS.Programado,
                              }}
                            >
                              {formatISODate(p.scheduledAt)}
                            </span>
                          ) : (
                            <span className="text-xs italic text-muted-foreground">
                              sin fecha registrada
                            </span>
                          )}
                        </Td>
                        <Td className="whitespace-nowrap">
                          {canMutate ? (
                            <input
                              type="date"
                              value={p.paidAt || ''}
                              onChange={(e) => setPaidDate(p.id, e.target.value)}
                              className="h-8 rounded-lg border border-input bg-background/60 px-2 text-sm shadow-sm transition focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            />
                          ) : p.paidAt ? (
                            <span
                              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                              style={{
                                background: `${PAYMENT_STATUS_COLORS.Listo}1A`,
                                color: PAYMENT_STATUS_COLORS.Listo,
                              }}
                            >
                              {formatISODate(p.paidAt)}
                            </span>
                          ) : (
                            <span className="text-xs italic text-muted-foreground">
                              sin registrar
                            </span>
                          )}
                        </Td>
                        <Td className="whitespace-nowrap">
                          <span
                            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                            style={{
                              background: `${PAYMENT_STATUS_COLORS[p.status]}1A`,
                              color: PAYMENT_STATUS_COLORS[p.status],
                            }}
                          >
                            <span
                              className="h-1.5 w-1.5 rounded-full"
                              style={{ background: PAYMENT_STATUS_COLORS[p.status] }}
                            />
                            {p.status}
                          </span>
                        </Td>
                        {canMutate && (
                          <Td className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => removeFromProgramados(p.id)}
                              aria-label="Quitar de programados"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </Td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
          <PaymentExecutionSchedule items={programados} />
        </>
      )}

      <AutoMonthsDialog
        open={!!autoFor}
        onOpenChange={(v) => !v && setAutoFor(null)}
        title={autoFor?.person}
        status={autoFor?.status || {}}
        onApply={(patch) => {
          if (autoFor) applyAuto(autoFor, patch);
        }}
      />

      <RheFormDialog
        open={creating}
        onOpenChange={setCreating}
        onSubmitted={(item) => {
          setEntries((arr) => [...arr, item]);
          router.refresh();
        }}
      />

      <RheFormDialog
        open={!!editing}
        onOpenChange={(v) => !v && setEditing(null)}
        entry={editing || undefined}
        onSubmitted={(item) => {
          setEntries((arr) => arr.map((x) => (x.id === item.id ? item : x)));
          setEditing(null);
          router.refresh();
        }}
      />

      <Dialog open={!!confirmDelete} onOpenChange={(v) => !v && setConfirmDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar RHE</DialogTitle>
            <DialogDescription>
              ¿Seguro que querés eliminar a{' '}
              <span className="font-semibold text-foreground">{confirmDelete?.person}</span>?
              Se borrará el estado de todos los meses de este registro.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
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
function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={`px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground ${className}`}
    >
      {children}
    </th>
  );
}
function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2.5 align-middle ${className}`}>{children}</td>;
}

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-soft">
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full" style={color ? { background: color } : undefined} />
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
      </div>
      <p
        className="mt-0.5 font-display text-2xl font-bold tabular-nums"
        style={color ? { color } : undefined}
      >
        {value}
      </p>
    </div>
  );
}

function PaymentStatusCell({
  status,
  editable,
  onChange,
  onManageAuto,
}: {
  status: PaymentStatus;
  editable: boolean;
  onChange: (s: PaymentStatus) => void;
  onManageAuto?: () => void;
}) {
  const color = PAYMENT_STATUS_COLORS[status];
  const badge = (
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
  );
  if (!editable) return badge;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button aria-label="Cambiar estado de pago">{badge}</button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center">
        <DropdownMenuLabel>Estado del pago</DropdownMenuLabel>
        {PAYMENT_STATUSES.map((s) => (
          <DropdownMenuItem key={s} onSelect={() => onChange(s)}>
            <span className="h-2 w-2 rounded-full" style={{ background: PAYMENT_STATUS_COLORS[s] }} />
            {s}
          </DropdownMenuItem>
        ))}
        {onManageAuto && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onManageAuto}>
              <CalendarClock className="h-3.5 w-3.5" />
              Automático en varios meses…
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PersonStatusCell({
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
        editable && 'cursor-pointer hover:ring-1 hover:ring-border',
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
            <span className="h-2 w-2 rounded-full" style={{ background: EMPLOYEE_STATUS_COLORS[s] }} />
            {s}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ============================================================================
// Modal crear / editar
// ============================================================================
function RheFormDialog({
  open,
  onOpenChange,
  entry,
  onSubmitted,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  entry?: RheEntry;
  onSubmitted: (item: RheEntry) => void;
}) {
  const isEdit = !!entry;
  const [loading, setLoading] = React.useState(false);

  const [person, setPerson] = React.useState('');
  const [personStatus, setPersonStatus] = React.useState<string>('Activo');
  const [contact, setContact] = React.useState('');
  const [area, setArea] = React.useState('');
  const [partida, setPartida] = React.useState('');
  const [entity, setEntity] = React.useState('');
  const [paymentDate, setPaymentDate] = React.useState('');

  React.useEffect(() => {
    if (!open) return;
    setPerson(entry?.person || '');
    setPersonStatus(entry?.personStatus || 'Activo');
    setContact(entry?.contact || '');
    setArea(entry?.area || '');
    setPartida(entry?.partida || '');
    setEntity(entry?.entity || '');
    setPaymentDate(entry?.paymentDate || '');
  }, [open, entry]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!person.trim()) return toast.error('Ingresá el nombre de la persona');
    setLoading(true);
    try {
      const url = isEdit ? `/api/rhe/${entry!.id}` : '/api/rhe';
      const body = {
        person: person.trim(),
        personStatus,
        contact: contact.trim() || null,
        area: area.trim() || null,
        partida: partida.trim() || null,
        entity: entity.trim() || null,
        paymentDate: paymentDate.trim() || null,
      };
      const res = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({ error: `Error ${res.status}` }));
      if (!res.ok) throw new Error((json as any).error || 'Error');
      onSubmitted((json as any).data);
      toast.success(isEdit ? 'RHE actualizado' : 'RHE creado');
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'No se pudo guardar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar RHE' : 'Nuevo RHE'}</DialogTitle>
          <DialogDescription>
            Datos de la persona. El estado de pago por mes se cambia en la tabla.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Persona</Label>
            <Input
              value={person}
              onChange={(e) => setPerson(e.target.value)}
              placeholder="Nombre completo"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={personStatus} onValueChange={setPersonStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EMPLOYEE_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Contacto</Label>
              <Input
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="Email / WhatsApp / referencia"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Áreas</Label>
              <Input value={area} onChange={(e) => setArea(e.target.value)} placeholder="Ej. PROYECTO" />
            </div>
            <div className="space-y-1.5">
              <Label>Partida</Label>
              <Input
                value={partida}
                onChange={(e) => setPartida(e.target.value)}
                placeholder="Ej. Outsourcing Contabilidad"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Entidad</Label>
              <Input value={entity} onChange={(e) => setEntity(e.target.value)} placeholder="Ej. BK" />
            </div>
            <div className="space-y-1.5">
              <Label>Fecha de pago</Label>
              <Input
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                placeholder="Ej. Ultimo lunes del mes"
              />
            </div>
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
