import 'server-only';
import { getSitiosClient } from './client';
import type {
  SitiosSnapshot,
  SitioFloor,
  SitioDesk,
  SitioProfile,
  SitioReservation,
  SitioBlock,
  SitioWorkerStatus,
  FloorOccupancy,
} from './types';

export interface SitiosPastData {
  today: string;
  floors: SitioFloor[];
  reservations: SitioReservation[]; // fecha < hoy, más recientes primero
}

const pad2 = (n: number) => String(n).padStart(2, '0');
function localDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/**
 * Lee el estado completo de Desk Buddy en Supabase y lo agrega en un snapshot
 * listo para la UI. Solo lectura.
 */
export async function getSitiosSnapshot(): Promise<SitiosSnapshot> {
  const supabase = await getSitiosClient();

  const now = new Date();
  const today = localDate(now);
  const horizon = new Date(now);
  horizon.setDate(horizon.getDate() + 14);
  const horizonStr = localDate(horizon);

  const [floorsRes, desksRes, profilesRes, resRes, blocksRes, statusRes] =
    await Promise.all([
      supabase.from('floors').select('id, name, capacity').order('id'),
      supabase.from('desks').select('id, number, floor_id, status'),
      supabase.from('profiles').select('id, user_id, name, email, team, floor'),
      supabase
        .from('reservations')
        .select('id, date, user_id, desk_id, is_auto_assigned')
        .gte('date', today)
        .lte('date', horizonStr)
        .order('date'),
      supabase
        .from('desk_blocks')
        .select(
          'id, desk_id, day_of_week, is_persistent, week_start, reason, assigned_user_id, specific_date',
        ),
      supabase
        .from('worker_statuses')
        .select('id, user_id, status, start_date, end_date, is_indefinite, notes'),
    ]);

  const firstError =
    floorsRes.error ||
    desksRes.error ||
    profilesRes.error ||
    resRes.error ||
    blocksRes.error ||
    statusRes.error;
  if (firstError) {
    throw new Error(`Error leyendo Supabase (Sitios): ${firstError.message}`);
  }

  const floors: SitioFloor[] = (floorsRes.data || []).map((f: any) => ({
    id: f.id,
    name: f.name,
    capacity: f.capacity ?? 0,
  }));

  const desks: SitioDesk[] = (desksRes.data || []).map((d: any) => ({
    id: d.id,
    number: d.number,
    floorId: d.floor_id,
    status: d.status,
  }));
  const deskById = new Map(desks.map((d) => [d.id, d]));

  const profiles: SitioProfile[] = (profilesRes.data || []).map((p: any) => ({
    id: p.id,
    userId: p.user_id,
    name: p.name,
    email: p.email,
    team: p.team,
    floor: p.floor,
  }));
  const profileByUser = new Map(profiles.map((p) => [p.userId, p]));

  const enrichRes = (r: any): SitioReservation => {
    const desk = deskById.get(r.desk_id);
    const prof = profileByUser.get(r.user_id);
    return {
      id: r.id,
      date: r.date,
      userId: r.user_id,
      deskId: r.desk_id,
      isAutoAssigned: !!r.is_auto_assigned,
      personName: prof?.name,
      team: prof?.team,
      deskNumber: desk?.number,
      floorId: desk?.floorId,
    };
  };
  const allRes: SitioReservation[] = (resRes.data || []).map(enrichRes);
  const reservationsToday = allRes.filter((r) => r.date === today);
  const upcoming = allRes.filter((r) => r.date > today);

  const blocks: SitioBlock[] = (blocksRes.data || []).map((b: any) => {
    const desk = deskById.get(b.desk_id);
    return {
      id: b.id,
      deskId: b.desk_id,
      dayOfWeek: b.day_of_week,
      isPersistent: !!b.is_persistent,
      weekStart: b.week_start,
      reason: b.reason,
      assignedUserId: b.assigned_user_id,
      specificDate: b.specific_date,
      deskNumber: desk?.number,
      floorId: desk?.floorId,
    };
  });

  const workerStatuses: SitioWorkerStatus[] = (statusRes.data || []).map(
    (s: any) => ({
      id: s.id,
      userId: s.user_id,
      status: s.status,
      startDate: s.start_date,
      endDate: s.end_date,
      isIndefinite: !!s.is_indefinite,
      notes: s.notes,
      personName: profileByUser.get(s.user_id)?.name,
    }),
  );

  // Ocupación de hoy = reservados ∪ bloqueados (misma fórmula que Desk Buddy).
  // Un escritorio bloqueado hoy cuenta como ocupado.
  // 1) Día ISO (1=lun..7=dom) y lunes de la semana de hoy.
  const dObj = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const jsDay = dObj.getDay();
  const isoDow = jsDay === 0 ? 7 : jsDay;
  const monday = new Date(dObj);
  monday.setDate(monday.getDate() - (isoDow - 1));
  const mondayStr = localDate(monday);

  // 2) Escritorios bloqueados HOY (replica isDeskBlockedOnDate de Desk Buddy).
  const blockedDeskIds = new Set<string>();
  for (const b of blocks) {
    let matches: boolean;
    if (b.specificDate) matches = b.specificDate === today;
    else if (b.dayOfWeek !== isoDow) matches = false;
    else if (b.isPersistent) matches = true;
    else matches = b.weekStart === mondayStr;
    if (matches) blockedDeskIds.add(b.deskId);
  }

  const reservedDeskIds = new Set(reservationsToday.map((r) => r.deskId));
  const isOccupied = (deskId: string) =>
    reservedDeskIds.has(deskId) || blockedDeskIds.has(deskId);

  const occupancyByFloor: FloorOccupancy[] = floors.map((f) => {
    const floorDesks = desks.filter((d) => d.floorId === f.id);
    // Segmentos sin doble conteo: reservados, y bloqueados-que-no-están-reservados.
    const reservedToday = floorDesks.filter((d) => reservedDeskIds.has(d.id)).length;
    const occupiedToday = floorDesks.filter((d) => isOccupied(d.id)).length;
    const blockedToday = Math.max(0, occupiedToday - reservedToday);
    return {
      floorId: f.id,
      floorName: f.name,
      capacity: f.capacity,
      desks: floorDesks.length,
      reservedToday,
      blockedToday,
      occupiedToday,
    };
  });

  const totalDesks = desks.length;
  const reservedToday = reservationsToday.length;
  const occupiedToday = desks.filter((d) => isOccupied(d.id)).length;
  const freeToday = Math.max(0, totalDesks - occupiedToday);
  const occupancyPct =
    totalDesks > 0 ? Math.round((occupiedToday / totalDesks) * 100) : 0;

  return {
    today,
    floors,
    desks,
    profiles,
    reservationsToday,
    upcoming,
    blocks,
    workerStatuses,
    occupancyByFloor,
    kpis: {
      totalDesks,
      reservedToday,
      freeToday,
      occupancyPct,
      totalPeople: profiles.length,
    },
  };
}

/**
 * Reservas anteriores (fecha < hoy), enriquecidas con persona/escritorio/piso,
 * más recientes primero. Desk Buddy conserva el histórico en su base.
 */
export async function getSitiosPastReservations(): Promise<SitiosPastData> {
  const supabase = await getSitiosClient();
  const today = localDate(new Date());

  const [floorsRes, desksRes, profilesRes, resRes] = await Promise.all([
    supabase.from('floors').select('id, name, capacity').order('id'),
    supabase.from('desks').select('id, number, floor_id, status'),
    supabase.from('profiles').select('id, user_id, name, email, team, floor'),
    supabase
      .from('reservations')
      .select('id, date, user_id, desk_id, is_auto_assigned')
      .lt('date', today)
      .order('date', { ascending: false }),
  ]);

  const firstError =
    floorsRes.error || desksRes.error || profilesRes.error || resRes.error;
  if (firstError) {
    throw new Error(`Error leyendo Supabase (Sitios anteriores): ${firstError.message}`);
  }

  const floors: SitioFloor[] = (floorsRes.data || []).map((f: any) => ({
    id: f.id,
    name: f.name,
    capacity: f.capacity ?? 0,
  }));
  const deskById = new Map(
    (desksRes.data || []).map((d: any) => [
      d.id,
      { number: d.number, floorId: d.floor_id },
    ]),
  );
  const profileByUser = new Map(
    (profilesRes.data || []).map((p: any) => [p.user_id, p]),
  );

  const reservations: SitioReservation[] = (resRes.data || []).map((r: any) => {
    const desk = deskById.get(r.desk_id);
    const prof = profileByUser.get(r.user_id);
    return {
      id: r.id,
      date: r.date,
      userId: r.user_id,
      deskId: r.desk_id,
      isAutoAssigned: !!r.is_auto_assigned,
      personName: prof?.name,
      team: prof?.team,
      deskNumber: desk?.number,
      floorId: desk?.floorId,
    };
  });

  return { today, floors, reservations };
}
