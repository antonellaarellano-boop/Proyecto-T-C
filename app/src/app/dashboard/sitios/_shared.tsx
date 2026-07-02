'use client';

import * as React from 'react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { Download } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown';
import { cn } from '@/lib/utils';
import type { SitioReservation, SitioFloor } from '@/lib/sitios/types';

export const DOW = [
  '',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
];

const ATT_COLORS: Record<string, string> = {
  'Llegó': '#22C55E',
  'No llegó': '#D14646',
};

export function floorName(floors: SitioFloor[], floorId?: number): string {
  if (floorId == null) return '—';
  return floors.find((f) => f.id === floorId)?.name || `Piso ${floorId}`;
}

export function fmtShort(iso?: string): string {
  if (!iso) return '—';
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

// Hook de asistencia: mantiene el mapa { reservationId: estado } y persiste.
export function useAttendance(initial: Record<string, string>) {
  const [map, setMap] = React.useState<Record<string, string>>(initial);
  React.useEffect(() => setMap(initial), [initial]);

  const setStatus = React.useCallback(
    async (res: SitioReservation, status: 'Llegó' | 'No llegó' | '') => {
      const prev = map;
      setMap((m) => {
        const n = { ...m };
        if (status) n[res.id] = status;
        else delete n[res.id];
        return n;
      });
      try {
        const r = await fetch('/api/sitios/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reservationId: res.id,
            date: res.date,
            person: res.personName,
            desk: res.deskNumber,
            floor: res.floorId ?? null,
            status,
          }),
        });
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          throw new Error((j as any).error || 'Error');
        }
      } catch (err: any) {
        setMap(prev);
        toast.error(err.message || 'No se pudo guardar la asistencia');
      }
    },
    [map],
  );

  return { map, setStatus };
}

function AttendanceCell({
  status,
  editable,
  onChange,
}: {
  status?: string;
  editable: boolean;
  onChange: (s: 'Llegó' | 'No llegó' | '') => void;
}) {
  if (!editable) {
    if (!status) return <span className="text-xs text-muted-foreground">—</span>;
    const color = ATT_COLORS[status];
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
        style={{ background: `${color}1A`, color }}
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
        {status}
      </span>
    );
  }

  const color = status ? ATT_COLORS[status] : undefined;
  const trigger = status ? (
    <span
      className="inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold hover:ring-1 hover:ring-border"
      style={{ background: `${color}1A`, color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {status}
    </span>
  ) : (
    <span className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground hover:text-foreground">
      + marcar
    </span>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button aria-label="Marcar asistencia">{trigger}</button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center">
        <DropdownMenuLabel>Asistencia</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => onChange('Llegó')}>
          <span className="h-2 w-2 rounded-full" style={{ background: ATT_COLORS['Llegó'] }} />
          Llegó
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onChange('No llegó')}>
          <span className="h-2 w-2 rounded-full" style={{ background: ATT_COLORS['No llegó'] }} />
          No llegó
        </DropdownMenuItem>
        {status && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onChange('')}>
              Dejar sin marcar
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Exporta una lista de reservas a un archivo .xlsx (mismas columnas visibles).
function exportReservationsToExcel(
  reservations: SitioReservation[],
  opts: {
    showDate?: boolean;
    showAttendance?: boolean;
    attMap?: Record<string, string>;
    fileName: string;
  },
) {
  const { showDate, showAttendance, attMap = {}, fileName } = opts;
  const header: string[] = [];
  if (showDate) header.push('Fecha');
  header.push('Persona', 'Equipo', 'Escritorio');
  if (showAttendance) header.push('Asistencia');

  const aoa: string[][] = [header];
  for (const r of reservations) {
    const row: string[] = [];
    if (showDate) row.push(fmtShort(r.date));
    row.push(r.personName || '', r.team || '', r.deskNumber || '');
    if (showAttendance) row.push(attMap[r.id] || '');
    aoa.push(row);
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Reservas');
  const name = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
  XLSX.writeFile(wb, name);
}

// Tabla de reservas reutilizable. Con showAttendance agrega la columna editable.
// Con downloadName muestra un botón para descargar la tabla en Excel.
export function ReservationsTable({
  reservations,
  showDate = false,
  showAttendance = false,
  canMutate = false,
  attMap = {},
  onSetAtt,
  emptyText = 'Sin reservas',
  downloadName,
}: {
  reservations: SitioReservation[];
  showDate?: boolean;
  showAttendance?: boolean;
  canMutate?: boolean;
  attMap?: Record<string, string>;
  onSetAtt?: (res: SitioReservation, s: 'Llegó' | 'No llegó' | '') => void;
  emptyText?: string;
  downloadName?: string;
}) {
  if (reservations.length === 0) {
    return (
      <div className="flex h-20 items-center justify-center rounded-xl bg-muted/40 text-center text-sm text-muted-foreground">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {downloadName && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() =>
              exportReservationsToExcel(reservations, {
                showDate,
                showAttendance,
                attMap,
                fileName: downloadName,
              })
            }
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:border-emerald-300 hover:text-emerald-700 dark:hover:text-emerald-300"
          >
            <Download className="h-3.5 w-3.5" />
            Excel
          </button>
        </div>
      )}
      <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-muted/40 text-left">
            {showDate && <Th>Fecha</Th>}
            <Th>Persona</Th>
            <Th>Equipo</Th>
            <Th>Escritorio</Th>
            {showAttendance && <Th>Asistencia</Th>}
          </tr>
        </thead>
        <tbody>
          {reservations.map((r) => (
            <tr key={r.id} className="border-t border-border hover:bg-muted/30">
              {showDate && <Td className="whitespace-nowrap text-muted-foreground">{fmtShort(r.date)}</Td>}
              <Td className="font-medium text-foreground">{r.personName || '—'}</Td>
              <Td className="text-muted-foreground">{r.team || '—'}</Td>
              <Td className="text-muted-foreground">{r.deskNumber || '—'}</Td>
              {showAttendance && (
                <Td>
                  <AttendanceCell
                    status={attMap[r.id]}
                    editable={canMutate}
                    onChange={(s) => onSetAtt?.(r, s)}
                  />
                </Td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </th>
  );
}
function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={cn('px-3 py-2.5 align-middle', className)}>{children}</td>;
}
