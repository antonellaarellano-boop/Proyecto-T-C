'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { CalendarClock, ChevronDown, Pencil, Plus, Search, Trash2, Wallet } from 'lucide-react';
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
  DEFAULT_PAYMENT_STATUS,
  PAYMENT_MONTHS,
  PAYMENT_STATUSES,
  PAYMENT_STATUS_COLORS,
  type FixedPayment,
  type PaymentStatus,
} from '@/lib/types';
import { useCanMutate } from '@/components/auth/role-context';
import { cn } from '@/lib/utils';
import { PaymentsCharts } from '@/components/dashboard/payments-charts';
import { AutoMonthsDialog } from '@/components/dashboard/auto-months-dialog';
import { PaymentExecutionSchedule } from '@/components/dashboard/payment-execution-schedule';

export function PagosFijosTable({
  initialPayments,
}: {
  initialPayments: FixedPayment[];
}) {
  const router = useRouter();
  const canMutate = useCanMutate();

  const [payments, setPayments] = React.useState(initialPayments);
  React.useEffect(() => setPayments(initialPayments), [initialPayments]);

  const [search, setSearch] = React.useState('');
  // Mes seleccionado: la tabla muestra UNA sola columna de mes a la vez.
  const currentMonthKey = PAYMENT_MONTHS[new Date().getMonth()]?.key ?? 'ene';
  const [selectedMonth, setSelectedMonth] = React.useState<string>(currentMonthKey);
  // Separa los pagos según su estado en el mes elegido.
  const [statusTab, setStatusTab] = React.useState<
    'pendiente' | 'programado' | 'listo' | 'todos'
  >('pendiente');

  const [creating, setCreating] = React.useState(false);
  const [editing, setEditing] = React.useState<FixedPayment | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState<FixedPayment | null>(null);
  const [autoFor, setAutoFor] = React.useState<FixedPayment | null>(null);

  const selectedMonthInfo =
    PAYMENT_MONTHS.find((m) => m.key === selectedMonth) || PAYMENT_MONTHS[0];

  const ordinalById = React.useMemo(() => {
    const m = new Map<string, number>();
    payments.forEach((p, i) => m.set(p.id, i + 1));
    return m;
  }, [payments]);

  // 1) Búsqueda (sin la pestaña de estado).
  const searched = React.useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return payments;
    return payments.filter((p) =>
      `${p.name} ${p.provider || ''} ${p.partida || ''} ${p.sender || ''}`
        .toLowerCase()
        .includes(q),
    );
  }, [payments, search]);

  const statusOf = React.useCallback(
    (p: FixedPayment) => p.status[selectedMonth] || DEFAULT_PAYMENT_STATUS,
    [selectedMonth],
  );

  // "Listo" agrupa los pagos ya resueltos: Listo + Automático + No se realizó.
  const isClosed = React.useCallback(
    (p: FixedPayment) => {
      const s = statusOf(p);
      return s === 'Listo' || s === 'Automatico' || s === 'No se realizo';
    },
    [statusOf],
  );

  // 2) Contadores por pestaña (respetan la búsqueda, no la pestaña activa).
  const tabCounts = React.useMemo(() => {
    let pendiente = 0;
    let programado = 0;
    let listo = 0;
    for (const p of searched) {
      const s = statusOf(p);
      if (s === 'Pendiente') pendiente += 1;
      else if (s === 'Programado') programado += 1;
      else if (s === 'Listo' || s === 'Automatico' || s === 'No se realizo') listo += 1;
    }
    return { pendiente, programado, listo, todos: searched.length };
  }, [searched, statusOf]);

  // 3) Pestaña activa.
  const filtered = React.useMemo(() => {
    if (statusTab === 'pendiente')
      return searched.filter((p) => statusOf(p) === 'Pendiente');
    if (statusTab === 'programado')
      return searched.filter((p) => statusOf(p) === 'Programado');
    if (statusTab === 'listo') return searched.filter((p) => isClosed(p));
    return searched;
  }, [searched, statusTab, statusOf, isClosed]);

  // Resumen de estados del mes seleccionado.
  const monthStats = React.useMemo(() => {
    const counts: Record<string, number> = {
      Pendiente: 0,
      Programado: 0,
      Listo: 0,
      'No se realizo': 0,
    };
    for (const p of payments) {
      const s = p.status[selectedMonth] || DEFAULT_PAYMENT_STATUS;
      counts[s] = (counts[s] || 0) + 1;
    }
    return counts;
  }, [payments, selectedMonth]);

  // Programados del mes: se basa en TENER fecha de programación guardada, no en el
  // status actual. Así no desaparecen al cambiar de Programado a otro estado; se
  // quitan manualmente con el botón de la fila.
  const programados = React.useMemo(
    () =>
      payments
        .filter((p) => !!p.scheduledAt?.[selectedMonth])
        .map((p) => ({
          id: p.id,
          name: p.name,
          paymentDate: p.paymentDate,
          scheduledAt: p.scheduledAt?.[selectedMonth],
          paidAt: p.paidAt?.[selectedMonth],
          status: p.status[selectedMonth] || DEFAULT_PAYMENT_STATUS,
        })),
    [payments, selectedMonth],
  );

  async function setStatus(
    payment: FixedPayment,
    monthKey: string,
    status: PaymentStatus,
  ) {
    const current = payment.status[monthKey] || DEFAULT_PAYMENT_STATUS;
    if (current === status) return;
    // Al marcar "Programado" se registra la fecha en que se eligió.
    const scheduledAt =
      status === 'Programado'
        ? { ...(payment.scheduledAt || {}), [monthKey]: localNowInput() }
        : payment.scheduledAt;
    const prev = payments;
    setPayments((arr) =>
      arr.map((p) =>
        p.id === payment.id
          ? { ...p, status: { ...p.status, [monthKey]: status }, scheduledAt }
          : p,
      ),
    );
    try {
      const res = await fetch(`/api/payments/${payment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: { [monthKey]: status },
          ...(status === 'Programado' ? { scheduledAt } : {}),
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as any).error || 'Error');
      }
    } catch (err: any) {
      setPayments(prev);
      toast.error(err.message || 'No se pudo actualizar');
    }
  }

  // Edita la fecha en que se programó un pago para el mes elegido.
  async function setScheduledDate(paymentId: string, monthKey: string, iso: string) {
    const payment = payments.find((p) => p.id === paymentId);
    if (!payment) return;
    const newScheduled = { ...(payment.scheduledAt || {}), [monthKey]: iso };
    const prev = payments;
    setPayments((arr) =>
      arr.map((p) => (p.id === paymentId ? { ...p, scheduledAt: newScheduled } : p)),
    );
    try {
      const res = await fetch(`/api/payments/${paymentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledAt: newScheduled }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as any).error || 'Error');
      }
    } catch (err: any) {
      setPayments(prev);
      toast.error(err.message || 'No se pudo actualizar la fecha');
    }
  }

  // Registra/edita la fecha REAL en que se pagó (mes elegido). '' la borra.
  async function setPaidDate(paymentId: string, monthKey: string, iso: string) {
    const payment = payments.find((p) => p.id === paymentId);
    if (!payment) return;
    const newPaid = { ...(payment.paidAt || {}) };
    if (iso) newPaid[monthKey] = iso;
    else delete newPaid[monthKey];
    const prev = payments;
    setPayments((arr) =>
      arr.map((p) => (p.id === paymentId ? { ...p, paidAt: newPaid } : p)),
    );
    try {
      const res = await fetch(`/api/payments/${paymentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paidAt: newPaid }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as any).error || 'Error');
      }
    } catch (err: any) {
      setPayments(prev);
      toast.error(err.message || 'No se pudo guardar la fecha de pago');
    }
  }

  // Quita manualmente un pago de la lista de Programados del mes (borra su fecha).
  async function removeFromProgramados(paymentId: string) {
    const payment = payments.find((p) => p.id === paymentId);
    if (!payment) return;
    const { [selectedMonth]: _omit, ...rest } = payment.scheduledAt || {};
    const prev = payments;
    setPayments((arr) =>
      arr.map((p) => (p.id === paymentId ? { ...p, scheduledAt: rest } : p)),
    );
    try {
      const res = await fetch(`/api/payments/${paymentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledAt: rest }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as any).error || 'Error');
      }
    } catch (err: any) {
      setPayments(prev);
      toast.error(err.message || 'No se pudo quitar');
    }
  }

  // Aplica "Automatico" (o lo revierte) a varios meses de un pago de una vez.
  async function applyAuto(payment: FixedPayment, patch: Record<string, PaymentStatus>) {
    if (Object.keys(patch).length === 0) return;
    const prev = payments;
    setPayments((arr) =>
      arr.map((p) =>
        p.id === payment.id ? { ...p, status: { ...p.status, ...patch } } : p,
      ),
    );
    try {
      const res = await fetch(`/api/payments/${payment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: patch }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as any).error || 'Error');
      }
      toast.success('Meses automáticos actualizados');
    } catch (err: any) {
      setPayments(prev);
      toast.error(err.message || 'No se pudo actualizar');
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    const id = confirmDelete.id;
    setConfirmDelete(null);
    const prev = payments;
    setPayments((arr) => arr.filter((p) => p.id !== id));
    try {
      const res = await fetch(`/api/payments/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error');
      toast.success('Pago eliminado');
      router.refresh();
    } catch {
      setPayments(prev);
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

      {/* Barra de filtros por mes — una sola columna a la vez */}
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

      {/* Gráficos de decisión: estado del mes + pendientes por mes */}
      <PaymentsCharts
        payments={payments}
        selectedMonth={selectedMonth}
        onSelectMonth={setSelectedMonth}
      />

      {/* Pestañas: separa los pagos por su estado en el mes elegido */}
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
                <Wallet className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <CardTitle>Pagos fijos · {selectedMonthInfo.full}</CardTitle>
                <CardDescription>
                  Tocá una celda del mes para cambiar su estado · por defecto Pendiente
                </CardDescription>
              </div>
            </div>
            <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto">
              <div className="relative min-w-0 flex-1 lg:w-56 lg:flex-none">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar pago, proveedor..."
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
                  Pago
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {filtered.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center rounded-xl bg-muted/40 p-6 text-center">
              {statusTab === 'pendiente' && payments.length > 0 && !search ? (
                <>
                  <p className="text-sm font-medium text-foreground">
                    ¡Sin pendientes en {selectedMonthInfo.full}! 🎉
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground/70">
                    Ningún pago quedó pendiente. Mirá "Programado" o "Listo".
                  </p>
                </>
              ) : statusTab === 'programado' ? (
                <p className="text-sm font-medium text-muted-foreground">
                  No hay pagos programados en {selectedMonthInfo.full}
                </p>
              ) : statusTab === 'listo' ? (
                <p className="text-sm font-medium text-muted-foreground">
                  Todavía no hay pagos cerrados (Listo / No se realizó) en{' '}
                  {selectedMonthInfo.full}
                </p>
              ) : (
                <>
                  <p className="text-sm font-medium text-muted-foreground">
                    No hay pagos para mostrar
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground/70">
                    Agregá uno con el botón "Pago" o ajustá la búsqueda.
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[920px] border-collapse text-sm">
                <thead>
                  <tr className="bg-muted/40 text-left">
                    <Th className="w-10 text-center">#</Th>
                    <Th>Nombre de pago</Th>
                    <Th className="text-center">{selectedMonthInfo.label}</Th>
                    <Th>Proveedor</Th>
                    <Th>Partida</Th>
                    <Th>Quien manda</Th>
                    <Th>Fecha de pago</Th>
                    {canMutate && <Th className="text-right">Acciones</Th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p, i) => {
                    const status = p.status[selectedMonth] || DEFAULT_PAYMENT_STATUS;
                    return (
                      <motion.tr
                        key={p.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(i * 0.012, 0.2) }}
                        className="border-t border-border transition-colors hover:bg-muted/30"
                      >
                        <Td className="text-center text-xs font-medium tabular-nums text-muted-foreground">
                          {ordinalById.get(p.id)}
                        </Td>
                        <Td className="min-w-[200px] font-medium text-foreground">
                          {p.name}
                        </Td>
                        <Td className="text-center">
                          <StatusCell
                            status={status}
                            editable={canMutate}
                            onChange={(s) => setStatus(p, selectedMonth, s)}
                            onManageAuto={() => setAutoFor(p)}
                          />
                        </Td>
                        <Td className="whitespace-nowrap text-muted-foreground">
                          {p.provider || '—'}
                        </Td>
                        <Td className="whitespace-nowrap text-muted-foreground">
                          {p.partida || '—'}
                        </Td>
                        <Td className="whitespace-nowrap text-muted-foreground">
                          {p.sender || '—'}
                        </Td>
                        <Td className="whitespace-nowrap text-muted-foreground">
                          {p.paymentDate || '—'}
                        </Td>
                        {canMutate && (
                          <Td>
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => setEditing(p)}
                                aria-label="Editar"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => setConfirmDelete(p)}
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

      {/* Detalle de programados del mes con su fecha de programación */}
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
                  Fecha en que se marcó cada pago como programado
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[520px] border-collapse text-sm">
                <thead>
                  <tr className="bg-muted/40 text-left">
                    <Th>Nombre de pago</Th>
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
                            onChange={(e) =>
                              setScheduledDate(p.id, selectedMonth, e.target.value)
                            }
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
                            onChange={(e) =>
                              setPaidDate(p.id, selectedMonth, e.target.value)
                            }
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
        title={autoFor?.name}
        status={autoFor?.status || {}}
        onApply={(patch) => {
          if (autoFor) applyAuto(autoFor, patch);
        }}
      />

      <PaymentFormDialog
        open={creating}
        onOpenChange={setCreating}
        onSubmitted={(item) => {
          setPayments((arr) => [...arr, item]);
          router.refresh();
        }}
      />

      <PaymentFormDialog
        open={!!editing}
        onOpenChange={(v) => !v && setEditing(null)}
        payment={editing || undefined}
        onSubmitted={(item) => {
          setPayments((arr) => arr.map((x) => (x.id === item.id ? item : x)));
          setEditing(null);
          router.refresh();
        }}
      />

      <Dialog open={!!confirmDelete} onOpenChange={(v) => !v && setConfirmDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar pago</DialogTitle>
            <DialogDescription>
              ¿Seguro que querés eliminar{' '}
              <span className="font-semibold text-foreground">{confirmDelete?.name}</span>?
              Se borrará el estado de todos los meses de este pago.
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

function formatISODate(iso?: string): string {
  if (!iso) return '—';
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

const pad2 = (n: number) => String(n).padStart(2, '0');
// Fecha/hora local actual en formato de input datetime-local.
function localNowInput(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(
    d.getHours(),
  )}:${pad2(d.getMinutes())}`;
}
// Normaliza un valor guardado (date o datetime) al formato del input.
function toDateTimeInput(s?: string): string {
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return `${s}T00:00`;
  return s.slice(0, 16);
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

function StatusCell({
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
        <button aria-label="Cambiar estado del pago">{badge}</button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center">
        <DropdownMenuLabel>Estado del pago</DropdownMenuLabel>
        {PAYMENT_STATUSES.map((s) => (
          <DropdownMenuItem key={s} onSelect={() => onChange(s)}>
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: PAYMENT_STATUS_COLORS[s] }}
            />
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

// ============================================================================
// Modal crear / editar pago
// ============================================================================
function PaymentFormDialog({
  open,
  onOpenChange,
  payment,
  onSubmitted,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  payment?: FixedPayment;
  onSubmitted: (item: FixedPayment) => void;
}) {
  const isEdit = !!payment;
  const [loading, setLoading] = React.useState(false);

  const [name, setName] = React.useState('');
  const [provider, setProvider] = React.useState('');
  const [partida, setPartida] = React.useState('');
  const [sender, setSender] = React.useState('');
  const [paymentDate, setPaymentDate] = React.useState('');

  React.useEffect(() => {
    if (!open) return;
    setName(payment?.name || '');
    setProvider(payment?.provider || '');
    setPartida(payment?.partida || '');
    setSender(payment?.sender || '');
    setPaymentDate(payment?.paymentDate || '');
  }, [open, payment]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return toast.error('Ingresá el nombre del pago');
    setLoading(true);
    try {
      const url = isEdit ? `/api/payments/${payment!.id}` : '/api/payments';
      const body = {
        name: name.trim(),
        provider: provider.trim() || null,
        partida: partida.trim() || null,
        sender: sender.trim() || null,
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
      toast.success(isEdit ? 'Pago actualizado' : 'Pago creado');
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
          <DialogTitle>{isEdit ? 'Editar pago' : 'Nuevo pago fijo'}</DialogTitle>
          <DialogDescription>
            Datos del pago recurrente. El estado por mes se cambia en la tabla.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nombre de pago</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Alquiler 404, Luz 202…"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Proveedor</Label>
              <Input
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                placeholder="Razón social"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Partida</Label>
              <Input
                value={partida}
                onChange={(e) => setPartida(e.target.value)}
                placeholder="Ej. Servicio de Telefonía"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Quien suele enviarlo</Label>
              <Input
                value={sender}
                onChange={(e) => setSender(e.target.value)}
                placeholder="Ej. Consuelo"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Fecha de pago</Label>
              <Input
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                placeholder="Ej. 1-3, Quincena (15-16)…"
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
