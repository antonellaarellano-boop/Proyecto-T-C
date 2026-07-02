import 'server-only';
import { getJuegosClient } from './client';
import { listHiddenJuegos } from '@/lib/data/juegos-hidden-store';
import type {
  JuegosSnapshot,
  JuegoReserva,
  JuegoMonthStat,
  JuegoCount,
} from './types';

const pad2 = (n: number) => String(n).padStart(2, '0');
function localDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

// Nombres legibles conocidos; los ids desconocidos se "prettifican".
const GAME_NAMES: Record<string, string> = {
  uno: 'UNO',
  'uno-no-mercy': 'UNO No Mercy',
  virus: 'Virus!',
  basta: 'Basta',
  'set-100': 'Set',
};

export function prettyGameName(gameId: string): string {
  if (!gameId) return '—';
  const known = GAME_NAMES[gameId.toLowerCase()];
  if (known) return known;
  return gameId
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// Formatea el horario: "12-13" → "12:00–13:00"; si ya trae ":" lo deja igual.
export function prettySlot(slot: string): string {
  if (!slot) return '—';
  const m = slot.match(/^(\d{1,2})\s*[-–a]\s*(\d{1,2})$/);
  if (m) return `${pad2(+m[1])}:00–${pad2(+m[2])}:00`;
  return slot.trim();
}

const MONTHS_ES = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
];
function monthLabel(month: string): string {
  const m = month.match(/^(\d{4})-(\d{2})$/);
  if (!m) return month;
  return `${MONTHS_ES[+m[2] - 1]} ${m[1]}`;
}

/**
 * Lee todas las reservas de juegos en Supabase y las agrega en un snapshot
 * listo para la UI (por mes, por juego, por horario). Solo lectura.
 */
export async function getJuegosSnapshot(): Promise<JuegosSnapshot> {
  const supabase = getJuegosClient();

  const [{ data, error }, hiddenIds] = await Promise.all([
    supabase
      .from('reservas')
      .select('id, game_id, day_key, date_iso, slot, colaborador, created_at')
      .order('date_iso', { ascending: false })
      .order('created_at', { ascending: false }),
    listHiddenJuegos(),
  ]);

  if (error) {
    throw new Error(`Error leyendo Supabase (Juegos): ${error.message}`);
  }

  // Reservas ocultadas SOLO en este sistema (no se borran en Supabase/Lovable);
  // se excluyen de la tabla y de todas las estadísticas.
  const hidden = new Set(hiddenIds);

  const reservas: JuegoReserva[] = (data || [])
    .filter((r: any) => !hidden.has(r.id))
    .map((r: any) => ({
    id: r.id,
    gameId: r.game_id || '',
    gameName: prettyGameName(r.game_id || ''),
    dayKey: r.day_key || '',
    dateIso: r.date_iso || '',
    slot: r.slot || '',
    slotLabel: prettySlot(r.slot || ''),
    colaborador: (r.colaborador || '').trim(),
    createdAt: r.created_at,
  }));

  // Agregación por mes: reservas totales + personas distintas.
  const monthMap = new Map<string, { reservas: number; people: Set<string> }>();
  for (const r of reservas) {
    const month = r.dateIso.slice(0, 7); // YYYY-MM
    if (!month) continue;
    if (!monthMap.has(month)) monthMap.set(month, { reservas: 0, people: new Set() });
    const bucket = monthMap.get(month)!;
    bucket.reservas += 1;
    if (r.colaborador) bucket.people.add(r.colaborador.toLowerCase());
  }
  const byMonth: JuegoMonthStat[] = Array.from(monthMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, v]) => ({
      month,
      label: monthLabel(month),
      reservas: v.reservas,
      personas: v.people.size,
    }));

  // Ranking de juegos (desc por cantidad).
  const gameMap = new Map<string, number>();
  for (const r of reservas) {
    if (!r.gameId) continue;
    gameMap.set(r.gameId, (gameMap.get(r.gameId) || 0) + 1);
  }
  const byGame: JuegoCount[] = Array.from(gameMap.entries())
    .map(([key, count]) => ({ key, label: prettyGameName(key), count }))
    .sort((a, b) => b.count - a.count);

  // Horarios más reservados (orden cronológico por hora de inicio).
  const slotMap = new Map<string, number>();
  for (const r of reservas) {
    if (!r.slot) continue;
    slotMap.set(r.slot, (slotMap.get(r.slot) || 0) + 1);
  }
  const slotStart = (slot: string) => {
    const m = slot.match(/^(\d{1,2})/);
    return m ? +m[1] : 99;
  };
  const bySlot: JuegoCount[] = Array.from(slotMap.entries())
    .map(([key, count]) => ({ key, label: prettySlot(key), count }))
    .sort((a, b) => slotStart(a.key) - slotStart(b.key));

  const people = new Set(
    reservas.map((r) => r.colaborador.toLowerCase()).filter(Boolean),
  );

  return {
    today: localDate(new Date()),
    reservas,
    byMonth,
    byGame,
    bySlot,
    kpis: {
      totalReservas: reservas.length,
      totalPersonas: people.size,
      topGame: byGame[0]?.label || '—',
      topSlot: bySlot.length
        ? [...bySlot].sort((a, b) => b.count - a.count)[0].label
        : '—',
    },
  };
}
