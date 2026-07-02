'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
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
import { Coins, Pencil, Plus, Trash2, X } from 'lucide-react';
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
  PAYMENT_MONTHS,
  type CatalogItem,
  type EngagementExpense,
} from '@/lib/types';
import { useCanMutate } from '@/components/auth/role-context';
import { cn } from '@/lib/utils';

function money(n?: number | null): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function GastosPorEvento({
  initialEvents,
  initialExpenses,
}: {
  initialEvents: CatalogItem[];
  initialExpenses: EngagementExpense[];
}) {
  const router = useRouter();
  const canMutate = useCanMutate();

  const [events, setEvents] = React.useState(initialEvents);
  React.useEffect(() => setEvents(initialEvents), [initialEvents]);
  const [expenses, setExpenses] = React.useState(initialExpenses);
  React.useEffect(() => setExpenses(initialExpenses), [initialExpenses]);

  const currentMonthKey = PAYMENT_MONTHS[new Date().getMonth()]?.key ?? 'ene';
  const [month, setMonth] = React.useState<string>(currentMonthKey);
  const [eventId, setEventId] = React.useState<string>(initialEvents[0]?.id ?? '');
  React.useEffect(() => {
    if (events.length === 0) setEventId('');
    else if (!events.some((e) => e.id === eventId)) setEventId(events[0].id);
  }, [events, eventId]);

  const [creatingEvent, setCreatingEvent] = React.useState(false);
  const [newEventName, setNewEventName] = React.useState('');
  const [confirmDeleteEvent, setConfirmDeleteEvent] = React.useState<CatalogItem | null>(null);

  const [creating, setCreating] = React.useState(false);
  const [editing, setEditing] = React.useState<EngagementExpense | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState<EngagementExpense | null>(null);

  const selectedEvent = events.find((e) => e.id === eventId) || null;
  const monthInfo = PAYMENT_MONTHS.find((m) => m.key === month) || PAYMENT_MONTHS[0];

  const filtered = React.useMemo(
    () => expenses.filter((e) => e.eventId === eventId && e.month === month),
    [expenses, eventId, month],
  );
  const total = filtered.reduce((a, e) => a + (e.amount || 0), 0);

  // Gasto TOTAL por mes (todos los eventos) — gráfico de arriba.
  const monthTotals = React.useMemo(
    () =>
      PAYMENT_MONTHS.map((m) => ({
        key: m.key,
        label: m.label,
        total: expenses
          .filter((e) => e.month === m.key)
          .reduce((a, e) => a + (e.amount || 0), 0),
      })),
    [expenses],
  );
  const anyMonthSpend = monthTotals.some((m) => m.total > 0);

  // Gasto por evento en el mes seleccionado — gráfico de abajo.
  const byEventForMonth = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const e of expenses) {
      if (e.month !== month) continue;
      map.set(e.eventId, (map.get(e.eventId) || 0) + (e.amount || 0));
    }
    return events
      .map((ev) => ({ id: ev.id, name: ev.name, total: map.get(ev.id) || 0 }))
      .filter((d) => d.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [expenses, events, month]);
  const monthGrandTotal = byEventForMonth.reduce((a, d) => a + d.total, 0);

  async function createEvent() {
    const name = newEventName.trim();
    if (!name) return toast.error('Ingresá el nombre de la actividad');
    try {
      const res = await fetch('/api/engagement/gasto-eventos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const json = await res.json().catch(() => ({ error: 'Error' }));
      if (!res.ok) throw new Error((json as any).error || 'Error');
      const item = (json as any).data as CatalogItem;
      setEvents((arr) => [...arr, item]);
      setEventId(item.id);
      setNewEventName('');
      setCreatingEvent(false);
      toast.success('Actividad creada');
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'No se pudo crear la actividad');
    }
  }

  async function deleteEvent() {
    if (!confirmDeleteEvent) return;
    const id = confirmDeleteEvent.id;
    setConfirmDeleteEvent(null);
    const prev = events;
    setEvents((arr) => arr.filter((e) => e.id !== id));
    try {
      const res = await fetch(`/api/engagement/gasto-eventos/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error');
      toast.success('Actividad eliminada');
      router.refresh();
    } catch {
      setEvents(prev);
      toast.error('No se pudo eliminar la actividad');
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    const id = confirmDelete.id;
    setConfirmDelete(null);
    const prev = expenses;
    setExpenses((arr) => arr.filter((e) => e.id !== id));
    try {
      const res = await fetch(`/api/engagement/expenses/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error');
      toast.success('Gasto eliminado');
      router.refresh();
    } catch {
      setExpenses(prev);
      toast.error('No se pudo eliminar');
    }
  }

  return (
    <>
      {/* Gráficos arriba de todo */}
      <Card>
        <CardContent className="space-y-5 pt-6">
          {/* Gráfico 1: gasto TOTAL por mes (todos los eventos) */}
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Gasto total por mes
            </p>
            {anyMonthSpend ? (
              <div className="h-52 w-full rounded-xl bg-muted/40 p-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={monthTotals}
                    margin={{ left: 0, right: 8, top: 18, bottom: 4 }}
                    onClick={(state: any) => {
                      const k = state?.activePayload?.[0]?.payload?.key;
                      if (k) setMonth(k);
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 4" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis
                      dataKey="label"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      width={44}
                      tickFormatter={(v: any) => `S/${v}`}
                    />
                    <Tooltip
                      cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
                      contentStyle={{
                        borderRadius: 12,
                        border: '1px solid hsl(var(--border))',
                        background: 'hsl(var(--popover))',
                        fontSize: 12,
                      }}
                      formatter={(v: any) => [money(Number(v)), 'Gastado']}
                      labelFormatter={(l: any) => `Mes: ${l}`}
                    />
                    <Bar dataKey="total" radius={[6, 6, 0, 0]} cursor="pointer">
                      {monthTotals.map((d) => (
                        <Cell key={d.key} fill="#CA8A04" fillOpacity={d.key === month ? 1 : 0.4} />
                      ))}
                      <LabelList
                        dataKey="total"
                        position="top"
                        fontSize={10}
                        fontWeight={700}
                        fill="hsl(var(--foreground))"
                        formatter={(v: any) => (Number(v) > 0 ? `S/${Math.round(Number(v))}` : '')}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-24 items-center justify-center rounded-xl bg-muted/40 text-center text-xs text-muted-foreground">
                Aún no hay gastos cargados
              </div>
            )}
          </div>

          {/* Gráfico 2: gasto por evento en el mes seleccionado */}
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Gastos por actividad · {monthInfo.full}
              {monthGrandTotal > 0 && (
                <span className="ml-2 normal-case text-muted-foreground/80">
                  {money(monthGrandTotal)} en total
                </span>
              )}
            </p>
            {byEventForMonth.length > 0 ? (
              <div
                className="w-full rounded-xl bg-muted/40 p-3"
                style={{ height: Math.max(byEventForMonth.length * 42 + 30, 130) }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={byEventForMonth}
                    layout="vertical"
                    margin={{ left: 8, right: 56, top: 6, bottom: 6 }}
                    barCategoryGap="22%"
                    onClick={(state: any) => {
                      const id = state?.activePayload?.[0]?.payload?.id;
                      if (id) setEventId(id);
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 4" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis
                      type="number"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: any) => `S/${v}`}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      stroke="hsl(var(--foreground))"
                      fontSize={12}
                      fontWeight={600}
                      tickLine={false}
                      axisLine={false}
                      width={150}
                      interval={0}
                    />
                    <Tooltip
                      cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
                      contentStyle={{
                        borderRadius: 12,
                        border: '1px solid hsl(var(--border))',
                        background: 'hsl(var(--popover))',
                        fontSize: 12,
                      }}
                      formatter={(v: any) => [money(Number(v)), 'Gastado']}
                    />
                    <Bar dataKey="total" radius={[0, 8, 8, 0]} minPointSize={3} cursor="pointer">
                      {byEventForMonth.map((d) => (
                        <Cell key={d.id} fill="#4453A0" fillOpacity={d.id === eventId ? 1 : 0.55} />
                      ))}
                      <LabelList
                        dataKey="total"
                        position="right"
                        fontSize={11}
                        fontWeight={700}
                        fill="hsl(var(--foreground))"
                        offset={8}
                        formatter={(v: any) => `S/${Math.round(Number(v))}`}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-24 items-center justify-center rounded-xl bg-muted/40 text-center text-xs text-muted-foreground">
                Sin gastos en {monthInfo.full}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex min-w-0 items-start gap-3">
            <div className="shrink-0 rounded-xl bg-brand-gold-100 p-2 text-brand-gold-700 dark:bg-brand-gold-600/20 dark:text-brand-gold-100">
              <Coins className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <CardTitle>Gastos por actividades del mes</CardTitle>
              <CardDescription>
                Registrá tus actividades y elegí mes + actividad para ver y cargar sus gastos
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Barra de meses */}
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Mes
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {PAYMENT_MONTHS.map((m) => {
                const active = m.key === month;
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setMonth(m.key)}
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

          {/* Barra de actividades (propias de este módulo) */}
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Actividad
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {events.map((ev) => {
                const active = ev.id === eventId;
                return (
                  <div
                    key={ev.id}
                    className={cn(
                      'inline-flex items-center rounded-full border transition',
                      active
                        ? 'border-brand-blue-300 bg-brand-blue-100 text-brand-blue-700 shadow-soft dark:border-brand-blue-500 dark:bg-brand-blue-600/25 dark:text-brand-blue-100'
                        : 'border-border bg-card text-muted-foreground hover:border-brand-blue-200 hover:text-foreground',
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setEventId(ev.id)}
                      className={cn(
                        'py-1.5 text-xs font-semibold uppercase tracking-wide',
                        canMutate && active ? 'pl-4 pr-1.5' : 'px-4',
                      )}
                    >
                      {ev.name}
                    </button>
                    {canMutate && active && (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteEvent(ev)}
                        className="mr-1.5 rounded-full p-0.5 hover:bg-black/5 dark:hover:bg-white/10"
                        aria-label="Eliminar evento"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
              {canMutate && (
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => {
                    setNewEventName('');
                    setCreatingEvent(true);
                  }}
                >
                  <Plus className="h-4 w-4" />
                  Actividad
                </Button>
              )}
              {events.length === 0 && (
                <span className="text-sm text-muted-foreground">
                  Aún no registraste actividades. Creá una con "+ Actividad".
                </span>
              )}
            </div>
          </div>

          {/* Tabla de gastos específicos */}
          {selectedEvent ? (
            <div>
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-semibold text-foreground">
                  {selectedEvent.name} · {monthInfo.full}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {money(total)} en total
                  </span>
                </p>
                {canMutate && (
                  <Button
                    variant="gradient"
                    size="sm"
                    className="shrink-0"
                    onClick={() => setCreating(true)}
                  >
                    <Plus className="h-4 w-4" />
                    Gasto
                  </Button>
                )}
              </div>

              {filtered.length === 0 ? (
                <div className="flex h-28 flex-col items-center justify-center rounded-xl bg-muted/40 p-6 text-center">
                  <p className="text-sm font-medium text-muted-foreground">
                    Sin gastos para {selectedEvent.name} en {monthInfo.full}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground/70">
                    Agregá uno con el botón "Gasto".
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full min-w-[420px] border-collapse text-sm">
                    <thead>
                      <tr className="bg-muted/40 text-left">
                        <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Nombre de gasto
                        </th>
                        <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Monto gastado
                        </th>
                        {canMutate && (
                          <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Acciones
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((e, i) => (
                        <motion.tr
                          key={e.id}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: Math.min(i * 0.02, 0.2) }}
                          className="border-t border-border transition-colors hover:bg-muted/30"
                        >
                          <td className="px-3 py-2.5 font-medium text-foreground">{e.name}</td>
                          <td className="px-3 py-2.5 text-right font-semibold tabular-nums">
                            {money(e.amount)}
                          </td>
                          {canMutate && (
                            <td className="px-3 py-2.5">
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
                            </td>
                          )}
                        </motion.tr>
                      ))}
                      <tr className="border-t-2 border-border bg-muted/30">
                        <td className="px-3 py-2.5 text-sm font-bold text-foreground">Total</td>
                        <td className="px-3 py-2.5 text-right text-sm font-bold tabular-nums text-foreground">
                          {money(total)}
                        </td>
                        {canMutate && <td />}
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-24 items-center justify-center rounded-xl bg-muted/40 text-center text-sm text-muted-foreground">
              Registrá y seleccioná una actividad para cargar sus gastos
            </div>
          )}
        </CardContent>
      </Card>

      {/* Crear actividad */}
      <Dialog open={creatingEvent} onOpenChange={setCreatingEvent}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva actividad</DialogTitle>
            <DialogDescription>
              Creá una actividad para registrar sus gastos (independiente de los eventos de
              participación).
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createEvent();
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label>Nombre de la actividad</Label>
              <Input
                value={newEventName}
                onChange={(e) => setNewEventName(e.target.value)}
                placeholder="Ej: Aniversario, Capacitación SENATI…"
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreatingEvent(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="gradient">
                <Plus className="h-4 w-4" />
                Crear
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmar eliminar actividad */}
      <Dialog open={!!confirmDeleteEvent} onOpenChange={(v) => !v && setConfirmDeleteEvent(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar actividad</DialogTitle>
            <DialogDescription>
              ¿Eliminar la actividad{' '}
              <span className="font-semibold text-foreground">{confirmDeleteEvent?.name}</span>?
              Sus gastos cargados dejarán de mostrarse.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteEvent(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={deleteEvent}>
              <Trash2 className="h-4 w-4" />
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Crear gasto */}
      {selectedEvent && (
        <ExpenseDialog
          open={creating}
          onOpenChange={setCreating}
          eventId={selectedEvent.id}
          eventName={selectedEvent.name}
          month={month}
          monthLabel={monthInfo.full}
          eventLabel={selectedEvent.name}
          onSubmitted={(item) => {
            setExpenses((arr) => [...arr, item]);
            router.refresh();
          }}
        />
      )}

      {/* Editar gasto */}
      <ExpenseDialog
        open={!!editing}
        onOpenChange={(v) => !v && setEditing(null)}
        expense={editing || undefined}
        eventId={editing?.eventId || ''}
        eventName={editing?.eventName}
        month={editing?.month || month}
        monthLabel={
          PAYMENT_MONTHS.find((m) => m.key === editing?.month)?.full || monthInfo.full
        }
        eventLabel={editing?.eventName || selectedEvent?.name || ''}
        onSubmitted={(item) => {
          setExpenses((arr) => arr.map((x) => (x.id === item.id ? item : x)));
          setEditing(null);
          router.refresh();
        }}
      />

      {/* Confirmar eliminar gasto */}
      <Dialog open={!!confirmDelete} onOpenChange={(v) => !v && setConfirmDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar gasto</DialogTitle>
            <DialogDescription>
              ¿Seguro que querés eliminar{' '}
              <span className="font-semibold text-foreground">{confirmDelete?.name}</span>?
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

function toNum(s: string): number | undefined {
  if (s.trim() === '') return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

function ExpenseDialog({
  open,
  onOpenChange,
  expense,
  eventId,
  eventName,
  month,
  monthLabel,
  eventLabel,
  onSubmitted,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  expense?: EngagementExpense;
  eventId: string;
  eventName?: string;
  month: string;
  monthLabel: string;
  eventLabel: string;
  onSubmitted: (item: EngagementExpense) => void;
}) {
  const isEdit = !!expense;
  const [loading, setLoading] = React.useState(false);
  const [name, setName] = React.useState('');
  const [amount, setAmount] = React.useState('');

  React.useEffect(() => {
    if (!open) return;
    setName(expense?.name || '');
    setAmount(expense?.amount !== undefined ? String(expense.amount) : '');
  }, [open, expense]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return toast.error('Ingresá el nombre del gasto');
    setLoading(true);
    try {
      const url = isEdit
        ? `/api/engagement/expenses/${expense!.id}`
        : '/api/engagement/expenses';
      const body = isEdit
        ? { name: name.trim(), amount: toNum(amount) ?? null }
        : {
            eventId,
            eventName: eventName || null,
            month,
            name: name.trim(),
            amount: toNum(amount) ?? null,
          };
      const res = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({ error: `Error ${res.status}` }));
      if (!res.ok) throw new Error((json as any).error || 'Error');
      onSubmitted((json as any).data);
      toast.success(isEdit ? 'Gasto actualizado' : 'Gasto registrado');
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
          <DialogTitle>{isEdit ? 'Editar gasto' : 'Nuevo gasto'}</DialogTitle>
          <DialogDescription>
            {eventLabel} · {monthLabel}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nombre de gasto</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Catering, Decoración, Premios…"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label>Monto gastado (S/)</Label>
            <Input
              type="number"
              min={0}
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="gradient" disabled={loading}>
              {isEdit ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {isEdit ? 'Guardar' : 'Registrar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
