'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { UserPlus, Trash2 } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { SitioWalkin, SitioFloor } from '@/lib/sitios/types';
import { floorName } from './_shared';

// Hook que mantiene la lista de walk-ins y persiste alta/baja contra la API.
// Todo local del sistema — NUNCA escribe en Desk Buddy/Supabase.
export function useWalkins(initial: SitioWalkin[]) {
  const [walkins, setWalkins] = React.useState<SitioWalkin[]>(initial);
  React.useEffect(() => setWalkins(initial), [initial]);

  const add = React.useCallback(
    async (data: {
      date: string;
      person: string;
      floorId: number | null;
      notes?: string | null;
    }) => {
      try {
        const res = await fetch('/api/sitios/walkins', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error((j as any).error || 'Error');
        setWalkins((w) => [...w, j.data]);
        return true;
      } catch (err: any) {
        toast.error(err.message || 'No se pudo registrar');
        return false;
      }
    },
    [],
  );

  const remove = React.useCallback(
    async (id: string) => {
      const prev = walkins;
      setWalkins((w) => w.filter((x) => x.id !== id));
      try {
        const res = await fetch(`/api/sitios/walkins/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error();
      } catch {
        setWalkins(prev);
        toast.error('No se pudo eliminar');
      }
    },
    [walkins],
  );

  return { walkins, add, remove };
}

// Tarjeta para registrar y listar walk-ins de un día puntual (por default, hoy).
export function WalkinsCard({
  date,
  dateLabel,
  floors,
  walkins,
  canMutate,
  onAdd,
  onRemove,
}: {
  date: string;
  dateLabel: string;
  floors: SitioFloor[];
  walkins: SitioWalkin[];
  canMutate: boolean;
  onAdd: (data: {
    date: string;
    person: string;
    floorId: number | null;
  }) => Promise<boolean>;
  onRemove: (id: string) => void;
}) {
  const [person, setPerson] = React.useState('');
  const [floorId, setFloorId] = React.useState<string>('');
  const [saving, setSaving] = React.useState(false);

  const dayWalkins = React.useMemo(
    () => walkins.filter((w) => w.date === date),
    [walkins, date],
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = person.trim();
    if (!name) return;
    setSaving(true);
    const ok = await onAdd({
      date,
      person: name,
      floorId: floorId === '' ? null : Number(floorId),
    });
    setSaving(false);
    if (ok) {
      setPerson('');
      setFloorId('');
      toast.success('Registrado como asistencia sin reserva');
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex min-w-0 items-start gap-3">
          <div className="shrink-0 rounded-xl bg-brand-gold-100 p-2 text-brand-gold-700 dark:bg-brand-gold-600/20 dark:text-brand-gold-100">
            <UserPlus className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <CardTitle>Vinieron sin reservar · {dateLabel}</CardTitle>
            <CardDescription>
              {dayWalkins.length} persona(s) · registro solo del sistema, no toca Desk Buddy
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {canMutate && (
          <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
            <div className="min-w-[180px] flex-1">
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Nombre
              </label>
              <input
                type="text"
                value={person}
                onChange={(e) => setPerson(e.target.value)}
                placeholder="Nombre y apellido"
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none transition focus:border-brand-blue-300"
              />
            </div>
            <div className="w-40">
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Piso (opcional)
              </label>
              <select
                value={floorId}
                onChange={(e) => setFloorId(e.target.value)}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none transition focus:border-brand-blue-300"
              >
                <option value="">Sin especificar</option>
                {floors.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={saving || !person.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-blue-500 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-brand-blue-600 disabled:opacity-50"
            >
              <UserPlus className="h-4 w-4" />
              Agregar
            </button>
          </form>
        )}

        {dayWalkins.length === 0 ? (
          <div className="flex h-16 items-center justify-center rounded-xl bg-muted/40 text-center text-sm text-muted-foreground">
            Nadie registrado sin reserva en {dateLabel}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-muted/40 text-left">
                  <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Persona</th>
                  <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Piso</th>
                  {canMutate && <th className="px-3 py-2.5"> </th>}
                </tr>
              </thead>
              <tbody>
                {dayWalkins.map((w) => (
                  <tr key={w.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-3 py-2.5 font-medium text-foreground">{w.person}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {w.floorId != null ? floorName(floors, w.floorId) : '—'}
                    </td>
                    {canMutate && (
                      <td className="px-3 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => onRemove(w.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs font-medium text-muted-foreground transition hover:border-rose-300 hover:text-rose-600 dark:hover:text-rose-300"
                          title="Eliminar del sistema"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
