// Tipos del apartado "Sitios" (datos de Desk Buddy en Supabase).

export interface SitioFloor {
  id: number;
  name: string;
  capacity: number;
}

export interface SitioDesk {
  id: string;
  number: string;
  floorId: number;
  status: string; // available / occupied / blocked...
}

export interface SitioProfile {
  id: string;
  userId: string;
  name: string;
  email: string;
  team: string;
  floor: number;
}

export interface SitioReservation {
  id: string;
  date: string; // YYYY-MM-DD
  userId: string;
  deskId: string;
  isAutoAssigned: boolean;
  // enriquecidos
  personName?: string;
  team?: string;
  deskNumber?: string;
  floorId?: number;
}

export interface SitioBlock {
  id: string;
  deskId: string;
  dayOfWeek: number; // 1..5
  isPersistent: boolean;
  weekStart?: string | null;
  reason?: string | null;
  assignedUserId?: string | null;
  specificDate?: string | null;
  deskNumber?: string;
  floorId?: number;
}

// Bloqueos fusionados: filas idénticas salvo el día se agrupan y los días se
// listan juntos (ej. Vania Hagel, mismo escritorio → Lun, Mar, Mié, Jue).
export interface MergedBlock {
  key: string;
  deskNumber?: string;
  floorId?: number;
  reason?: string | null;
  isPersistent: boolean;
  days: number[]; // day_of_week únicos, ordenados
  specificDates: string[]; // fechas puntuales si las hubiera
}

export interface SitioWorkerStatus {
  id: string;
  userId: string;
  status: string;
  startDate: string;
  endDate?: string | null;
  isIndefinite: boolean;
  notes?: string | null;
  personName?: string;
}

// Persona que VINO sin reservar (walk-in). Dato propio del sistema — NO existe
// en Desk Buddy/Supabase, se guarda solo localmente (KV/memoria).
export interface SitioWalkin {
  id: string;
  date: string; // YYYY-MM-DD
  person: string;
  floorId?: number | null; // piso donde se sentó (opcional)
  notes?: string | null;
  createdAt?: string;
}

export interface FloorOccupancy {
  floorId: number;
  floorName: string;
  capacity: number;
  desks: number;
  // Escritorios reservados hoy en el piso.
  reservedToday: number;
  // Escritorios bloqueados hoy que NO están reservados (segmento aparte, sin
  // doble conteo): reservedToday + blockedToday = occupiedToday.
  blockedToday: number;
  // Ocupados = reservados ∪ bloqueados hoy (igual que Lovable).
  occupiedToday: number;
}

export interface SitiosSnapshot {
  today: string; // YYYY-MM-DD (zona local del server)
  floors: SitioFloor[];
  desks: SitioDesk[];
  profiles: SitioProfile[];
  reservationsToday: SitioReservation[];
  upcoming: SitioReservation[]; // próximas reservas (hoy en adelante, acotado)
  blocks: SitioBlock[];
  workerStatuses: SitioWorkerStatus[];
  occupancyByFloor: FloorOccupancy[];
  kpis: {
    totalDesks: number;
    reservedToday: number;
    freeToday: number;
    occupancyPct: number;
    totalPeople: number;
  };
}
