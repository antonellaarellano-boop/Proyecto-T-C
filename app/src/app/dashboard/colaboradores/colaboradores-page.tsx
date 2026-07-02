'use client';

import * as React from 'react';
import * as XLSX from 'xlsx';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Users, Pencil, Plus, Search, Trash2, Download } from 'lucide-react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  EMPLOYEE_STATUSES,
  EMPLOYEE_STATUS_COLORS,
  type EmployeeStatus,
  type EngagementParticipant,
} from '@/lib/types';
import { useCanMutate, useIsAdmin } from '@/components/auth/role-context';

interface Props {
  initialColaboradores: EngagementParticipant[];
  areaOptions: string[];
}

function formatDate(iso?: string): string {
  if (!iso) return '—';
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

export function ColaboradoresPage({ initialColaboradores, areaOptions }: Props) {
  const router = useRouter();
  const canMutate = useCanMutate();
  const isAdmin = useIsAdmin();

  const [items, setItems] = React.useState(initialColaboradores);
  React.useEffect(() => setItems(initialColaboradores), [initialColaboradores]);

  const [search, setSearch] = React.useState('');
  const [tab, setTab] = React.useState<'activos' | 'cese'>('activos');
  const [creating, setCreating] = React.useState(false);
  const [editing, setEditing] = React.useState<EngagementParticipant | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState<EngagementParticipant | null>(null);

  const ordinalById = React.useMemo(() => {
    const m = new Map<string, number>();
    items.forEach((p, i) => m.set(p.id, i + 1));
    return m;
  }, [items]);

  // Conteos por tab (respetan la búsqueda pero NO el tab activo).
  const tabCounts = React.useMemo(() => {
    const q = search.toLowerCase().trim();
    let activos = 0;
    let cese = 0;
    for (const p of items) {
      if (q) {
        const hay = `${p.name} ${p.area || ''} ${p.dni || ''} ${p.position || ''}`.toLowerCase();
        if (!hay.includes(q)) continue;
      }
      if (p.status === 'Cese') cese += 1;
      else activos += 1;
    }
    return { activos, cese };
  }, [items, search]);

  const filtered = React.useMemo(() => {
    const q = search.toLowerCase().trim();
    return items.filter((p) => {
      if (tab === 'cese' && p.status !== 'Cese') return false;
      if (tab === 'activos' && p.status === 'Cese') return false;
      if (!q) return true;
      const hay = `${p.name} ${p.area || ''} ${p.dni || ''} ${p.position || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [items, search, tab]);

  const activos = items.filter((p) => p.status === 'Activo').length;

  // Descarga la tabla (lo que está filtrado: tab + búsqueda) en un .xlsx.
  function exportToExcel() {
    if (filtered.length === 0) {
      toast.error('No hay colaboradores para descargar');
      return;
    }
    const header = [
      'Status',
      'Área',
      'Nombres Completos',
      'Fecha ingreso',
      'Fecha nacimiento',
      'DNI',
      'Cargo',
    ];
    const aoa: string[][] = [header];
    for (const p of filtered) {
      aoa.push([
        p.status,
        p.area || '',
        p.name,
        formatDate(p.hireDate),
        formatDate(p.birthDate),
        p.dni || '',
        p.position || '',
      ]);
    }
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Colaboradores');
    const tabLabel = tab === 'cese' ? 'Cese' : 'Activos';
    XLSX.writeFile(wb, `Colaboradores - ${tabLabel}.xlsx`);
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    const id = confirmDelete.id;
    setConfirmDelete(null);
    const prev = items;
    setItems((arr) => arr.filter((p) => p.id !== id));
    try {
      const res = await fetch(`/api/engagement/participants/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error');
      toast.success('Colaborador eliminado');
      router.refresh();
    } catch {
      setItems(prev);
      toast.error('No se pudo eliminar');
    }
  }

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Colaboradores</h1>
          <p className="text-sm text-muted-foreground">
            Maestro de personas · alimenta la matriz de eventos de Engagement
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:max-w-md">
          <div className="rounded-xl border border-border bg-card p-4 shadow-card">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Colaboradores
            </p>
            <p className="mt-0.5 font-display text-2xl font-bold tabular-nums">{items.length}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-card">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Activos
            </p>
            <p
              className="mt-0.5 font-display text-2xl font-bold tabular-nums"
              style={{ color: EMPLOYEE_STATUS_COLORS.Activo }}
            >
              {activos}
            </p>
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
                  <Users className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <CardTitle>Datos</CardTitle>
                  <CardDescription>
                    Status, área, datos personales y cargo
                  </CardDescription>
                </div>
              </div>
              <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto">
                <div className="relative min-w-0 flex-1 lg:w-56 lg:flex-none">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar..."
                    className="pl-9"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={exportToExcel}
                >
                  <Download className="h-4 w-4" />
                  Excel
                </Button>
                {canMutate && (
                  <Button variant="gradient" size="sm" className="shrink-0" onClick={() => setCreating(true)}>
                    <Plus className="h-4 w-4" />
                    Colaborador
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
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full min-w-[920px] border-collapse text-sm">
                  <thead>
                    <tr className="bg-muted/40 text-left">
                      <Th className="w-10 text-center">#</Th>
                      <Th>Status</Th>
                      <Th>Área</Th>
                      <Th>Nombres Completos</Th>
                      <Th>Fecha ingreso</Th>
                      <Th>Fecha nacimiento</Th>
                      <Th>DNI</Th>
                      <Th>Cargo</Th>
                      <Th className="text-right">Acciones</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p, i) => {
                      const color = EMPLOYEE_STATUS_COLORS[p.status] || '#6873D7';
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
                          <Td>
                            <span
                              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                              style={{ background: `${color}1A`, color }}
                            >
                              <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
                              {p.status}
                            </span>
                          </Td>
                          <Td className="whitespace-nowrap text-muted-foreground">{p.area || '—'}</Td>
                          <Td className="whitespace-nowrap font-medium text-foreground">{p.name}</Td>
                          <Td className="whitespace-nowrap text-muted-foreground">{formatDate(p.hireDate)}</Td>
                          <Td className="whitespace-nowrap text-muted-foreground">{formatDate(p.birthDate)}</Td>
                          <Td className="whitespace-nowrap font-mono text-xs text-muted-foreground">{p.dni || '—'}</Td>
                          <Td className="whitespace-nowrap text-muted-foreground">{p.position || '—'}</Td>
                          <Td>
                            <div className="flex items-center justify-end gap-1">
                              {canMutate && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => setEditing(p)}
                                  aria-label="Editar"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              {isAdmin && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                  onClick={() => setConfirmDelete(p)}
                                  aria-label="Eliminar"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              {!canMutate && !isAdmin && (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </div>
                          </Td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ColaboradorFormDialog
        open={creating}
        onOpenChange={setCreating}
        areaOptions={areaOptions}
        onSubmitted={(item) => {
          setItems((arr) => [...arr, item]);
          router.refresh();
        }}
      />
      <ColaboradorFormDialog
        open={!!editing}
        onOpenChange={(v) => !v && setEditing(null)}
        colaborador={editing || undefined}
        areaOptions={areaOptions}
        onSubmitted={(item) => {
          setItems((arr) => arr.map((x) => (x.id === item.id ? item : x)));
          setEditing(null);
          router.refresh();
        }}
      />

      <Dialog open={!!confirmDelete} onOpenChange={(v) => !v && setConfirmDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar colaborador</DialogTitle>
            <DialogDescription>
              ¿Seguro que querés eliminar a{' '}
              <span className="font-semibold text-foreground">{confirmDelete?.name}</span>? Se
              quitará también de la matriz de eventos. Esta acción no se puede deshacer.
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

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground ${className}`}>
      {children}
    </th>
  );
}
function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2.5 align-middle ${className}`}>{children}</td>;
}

// ============================================================================
// Modal crear / editar colaborador
// ============================================================================
function ColaboradorFormDialog({
  open,
  onOpenChange,
  colaborador,
  areaOptions,
  onSubmitted,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  colaborador?: EngagementParticipant;
  areaOptions: string[];
  onSubmitted: (item: EngagementParticipant) => void;
}) {
  const isEdit = !!colaborador;
  const [loading, setLoading] = React.useState(false);
  const [name, setName] = React.useState('');
  const [status, setStatus] = React.useState<EmployeeStatus>('Activo');
  const [area, setArea] = React.useState('');
  const [hireDate, setHireDate] = React.useState('');
  const [birthDate, setBirthDate] = React.useState('');
  const [dni, setDni] = React.useState('');
  const [position, setPosition] = React.useState('');

  React.useEffect(() => {
    if (!open) return;
    setName(colaborador?.name || '');
    setStatus(colaborador?.status || 'Activo');
    setArea(colaborador?.area || '');
    setHireDate(colaborador?.hireDate || '');
    setBirthDate(colaborador?.birthDate || '');
    setDni(colaborador?.dni || '');
    setPosition(colaborador?.position || '');
  }, [open, colaborador]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return toast.error('Ingresá el nombre');
    setLoading(true);
    try {
      const url = isEdit
        ? `/api/engagement/participants/${colaborador!.id}`
        : '/api/engagement/participants';
      const res = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          status,
          area: area || null,
          hireDate: hireDate || null,
          birthDate: birthDate || null,
          dni: dni.trim() || null,
          position: position.trim() || null,
        }),
      });
      const json = await res.json().catch(() => ({ error: `Error ${res.status}` }));
      if (!res.ok) throw new Error((json as any).error || 'Error');
      onSubmitted((json as any).data);
      toast.success(isEdit ? 'Colaborador actualizado' : 'Colaborador creado');
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'No se pudo guardar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar colaborador' : 'Nuevo colaborador'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Modificá los datos del colaborador.'
              : 'Agregá un colaborador al maestro. Aparecerá en la matriz de eventos.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nombres Completos</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Apellidos, Nombres"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as EmployeeStatus)}>
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
              <Label>Área</Label>
              <Select value={area || 'none'} onValueChange={(v) => setArea(v === 'none' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {areaOptions.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Fecha de ingreso</Label>
              <Input type="date" value={hireDate} onChange={(e) => setHireDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Fecha de nacimiento</Label>
              <Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>DNI</Label>
              <Input value={dni} onChange={(e) => setDni(e.target.value)} placeholder="Documento" />
            </div>
            <div className="space-y-1.5">
              <Label>Cargo</Label>
              <Input value={position} onChange={(e) => setPosition(e.target.value)} placeholder="Puesto" />
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
