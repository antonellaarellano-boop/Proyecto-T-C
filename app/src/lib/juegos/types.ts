// Tipos del apartado "Juegos de mesa" (datos de la app de reserva de juegos en
// Supabase). Solo lectura.

export interface JuegoReserva {
  id: string;
  gameId: string;
  gameName: string; // nombre legible derivado de gameId
  dayKey: string; // 'hoy' | 'mañana' (al momento de reservar)
  dateIso: string; // YYYY-MM-DD
  slot: string; // valor crudo del horario
  slotLabel: string; // horario formateado (ej. "12:00–13:00")
  colaborador: string;
  createdAt?: string;
}

// Agregación por mes calendario (YYYY-MM).
export interface JuegoMonthStat {
  month: string; // YYYY-MM
  label: string; // "jun 2026"
  reservas: number; // total de reservas del mes
  personas: number; // colaboradores distintos del mes
}

// Ranking de juego u horario por cantidad de reservas.
export interface JuegoCount {
  key: string; // gameId o slot crudo
  label: string; // nombre legible
  count: number;
}

export interface JuegosSnapshot {
  today: string; // YYYY-MM-DD (zona local del server)
  reservas: JuegoReserva[]; // todas, más recientes primero
  byMonth: JuegoMonthStat[]; // orden cronológico
  byGame: JuegoCount[]; // desc por count
  bySlot: JuegoCount[]; // orden cronológico del horario
  kpis: {
    totalReservas: number;
    totalPersonas: number; // colaboradores distintos (histórico)
    topGame: string; // juego más reservado
    topSlot: string; // horario más reservado
  };
}
