// =============================================================================
// Dominio Baldecash Recruitment (mapeado al Airtable real)
// =============================================================================

export type Role = 'admin' | 'recruiter' | 'viewer';

// ---- Etapas del pipeline ----------------------------------------------------
export type Stage =
  | 'Screening'
  | 'Entrevista T&C'
  | 'Entrevista líder'
  | 'Prueba Tecnica'
  | 'Oferta'
  | 'Ingreso';

export const STAGES: Stage[] = [
  'Screening',
  'Entrevista T&C',
  'Entrevista líder',
  'Prueba Tecnica',
  'Oferta',
  'Ingreso',
];

export const STAGE_COLORS: Record<Stage, string> = {
  Screening: '#98A9DF',
  'Entrevista T&C': '#6873D7',
  'Entrevista líder': '#4453A0',
  'Prueba Tecnica': '#36B7B3',
  Oferta: '#FDCA56',
  Ingreso: '#00A29B',
};

// ---- Estado final del candidato --------------------------------------------
export type FinalStatus = 'En proceso' | 'Contratado' | 'Se cayó' | 'No seleccionado';

export const FINAL_STATUSES: FinalStatus[] = [
  'En proceso',
  'Contratado',
  'Se cayó',
  'No seleccionado',
];

export const FINAL_STATUS_COLORS: Record<FinalStatus, string> = {
  'En proceso': '#6873D7',
  Contratado: '#00A29B',
  'Se cayó': '#D14646',
  'No seleccionado': '#987933',
};

// ---- Vacantes ---------------------------------------------------------------
export type VacancyStatus = 'Abierta' | 'En Pausa' | 'Cerrada';
export const VACANCY_STATUSES: VacancyStatus[] = ['Abierta', 'En Pausa', 'Cerrada'];

export type Priority = 'Alta' | 'Media' | 'Baja';
export const PRIORITIES: Priority[] = ['Alta', 'Media', 'Baja'];

export type Modalidad = 'Hibrido' | 'Presencial';
export const MODALIDADES: Modalidad[] = ['Hibrido', 'Presencial'];

export type Area =
  | 'COBRANZAS'
  | 'CONTABILIDAD Y CONTROLLER'
  | 'CONVENCIONES Y ALIANZAS'
  | 'GROWTH'
  | 'LEGAL'
  | 'OPERACIONES'
  | 'TALENTO & CULTURA'
  | 'TECONOLOGIA Y FINANZAS'
  | 'VENTAS'
  | 'PRODUCT OWNER ';

export const AREAS: Area[] = [
  'COBRANZAS',
  'CONTABILIDAD Y CONTROLLER',
  'CONVENCIONES Y ALIANZAS',
  'GROWTH',
  'LEGAL',
  'OPERACIONES',
  'TALENTO & CULTURA',
  'TECONOLOGIA Y FINANZAS',
  'VENTAS',
  'PRODUCT OWNER ',
];

export type Fuente = 'LinkedIn' | 'Referido' | 'Computrabajo' | 'Bumeran';
export const FUENTES: Fuente[] = ['LinkedIn', 'Referido', 'Computrabajo', 'Bumeran'];

// ---- Motivos de caida (singleSelect en Airtable) ----
export type DropReason =
  | 'No asistió'
  | 'Desistió'
  | 'Fue contratado en otra empresa';

export const DROP_REASONS: DropReason[] = [
  'No asistió',
  'Desistió',
  'Fue contratado en otra empresa',
];

export const DROP_REASON_COLORS: Record<DropReason, string> = {
  'No asistió': '#D14646',
  Desistió: '#D17AA6',
  'Fue contratado en otra empresa': '#36B7B3',
};

export const RECRUITERS = ['Antonella Arellano', 'Mayra Pereira'] as const;
export const HIRING_MANAGERS = [
  'Antonella Arellano',
  'Jorge Morales',
  'Marco Del Rio',
  'Ruben Montenegro',
  'Meylin Miyashiro',
  'Yadira Yovera',
  'Monica Obando',
] as const;

// ---- Resultado de movimiento -----------------------------------------------
export type EtapaResultado = 'Aprobado' | 'Aceptó Oferta' | 'No se presentó';

// =============================================================================
// Entidades
// =============================================================================

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  avatarUrl?: string;
  active: boolean;
  createdAt: string;
  lastLoginAt?: string;
  passwordHash?: string;
}

export interface Candidate {
  id: string;               // ID_Candidato (singleLineText)
  recordId: string;         // rec... Airtable
  name: string;             // Nombre Completo
  email?: string;           // Email
  phone?: string;           // Teléfono
  linkedinUrl?: string;     // LinkedIn URL
  vacancyId?: string;       // ID Vacante (texto, no link)
  source: Fuente | string;  // Fuente
  appliedAt: string;        // Fecha Postulación
  recruiter?: string;       // Reclutador
  stage: Stage;             // Etapa Actual
  finalStatus: FinalStatus; // Estado Final
  dropReason?: DropReason | string; // Motivo Caída (singleSelect)
  hired?: boolean;          // Contratado
}

export interface Vacancy {
  id: string;               // ID_Vacante
  recordId: string;         // rec...
  title: string;            // Puesto
  area: Area | string;      // Área
  seniority?: string;       // Seniority
  recruiter?: string;       // Reclutador
  hiringManager?: string;   // Hiring Manager
  openedAt: string;         // Fecha Apertura
  closedAt?: string;        // Fecha Cierre
  status: VacancyStatus;    // Estado Vacante
  priority: Priority;       // Prioridad
  modalidad?: Modalidad;    // Modalidad
  positions: number;        // Cantidad Posiciones
  reopens?: number;         // Veces Reabierta
  reopenReason?: string;    // Motivo Reapertura
}

export interface StageMovement {
  id: string;               // ID Movimiento
  recordId: string;
  candidateId: string;      // ID Candidato
  vacancyId: string;        // ID Vacante
  stage: Stage;             // Etapa
  startedAt: string;        // Fecha Inicio
  endedAt?: string;         // Fecha Fin
  result?: EtapaResultado;  // Resultado
  comments?: string;        // Comentarios
}

export interface Source {
  id: string;
  sourceId?: string;        // ID Fuentes
  vacancyId?: string;       // ID VACANTE
  name: string;             // Fuente (singleSelect)
  monthlyCost?: number;     // Costo Mensual
  owner?: string;           // Responsable
}

export interface SalaryRange {
  id: string;
  vacancyId: string;        // ID VACANTE
  min?: number;             // SALARIO MINIMO
  max?: number;             // SALARIO MAXIMO
  status?: string;          // Status
}

export interface ReviewTime {
  id: string;
  reviewId: string;         // ID Revision
  candidateId?: string;     // ID Candidato
  cvSentAt?: string;        // Fecha de envio de cv
  returnedAt?: string;      // Fecha de Retorno de CV
  headName?: string;        // Nombre del Head
}

// Catalogos maestros (Seniorities, Hiring Managers, Reclutadores).
// Comparten estructura: ID propio + nombre + recordId interno de Airtable.
export interface CatalogItem {
  id: string;       // ID propio (S0001, HM0001, R0001)
  recordId: string; // rec... interno de Airtable
  name: string;     // Nombre legible
}

export type CatalogType = 'seniorities' | 'hiring-managers' | 'recruiters';

export interface Ingreso {
  id: string;
  candidateId: string;      // ID Candidato
  finalSalary?: number;     // Salario final
  startDate: string;        // Fecha Ingreso
  stillEmployed?: boolean;  // Sigue en Empresa
  endDate?: string;         // Fecha Salida
  passedProbation?: boolean;// Pasó Periodo Prueba
  performance?: string;     // Performance
  leaderComment?: string;   // Comentario Líder
}

// =============================================================================
// Engagement & Cultura
// =============================================================================

// Estado laboral del colaborador en la matriz de eventos.
export type EmployeeStatus = 'Activo' | 'Cese';
export const EMPLOYEE_STATUSES: EmployeeStatus[] = ['Activo', 'Cese'];

export const EMPLOYEE_STATUS_COLORS: Record<EmployeeStatus, string> = {
  Activo: '#00A29B',
  Cese: '#D14646',
};

// Estado de participación de un colaborador en un evento puntual.
export type ParticipationStatus =
  | 'Participo'
  | 'No Participo'
  | 'No Aplica'
  | 'Aun No Participa';

export const PARTICIPATION_STATUSES: ParticipationStatus[] = [
  'Participo',
  'No Participo',
  'No Aplica',
  'Aun No Participa',
];

export const PARTICIPATION_COLORS: Record<ParticipationStatus, string> = {
  Participo: '#00A29B',        // verde — asistió / participó
  'No Participo': '#D14646',   // rojo — no participó
  'No Aplica': '#94A3B8',      // gris — no aplica
  'Aun No Participa': '#FDCA56',// ámbar — pendiente
};

// Áreas para la matriz de engagement (lista propia, editable por celda).
export const ENGAGEMENT_AREAS = [
  'Cobranzas',
  'Contabilidad y controller',
  'Convenciones y alianzas',
  'Growth',
  'Legal',
  'Talento & Cultura',
  'Tecnologia y finanzas',
  'Ventas',
  'Operaciones',
] as const;

export type EngagementArea = (typeof ENGAGEMENT_AREAS)[number];

// Evento de cultura (columna de la matriz).
export interface EngagementEvent {
  id: string;        // EV0001, EV0002, ...
  name: string;      // "Desayuno con Ruben", "Dia de la Mujer", ...
  date?: string;     // Fecha del evento (opcional)
}

// Colaborador con su estado y participación por evento (fila de la matriz).
export interface EngagementParticipant {
  id: string;        // EP0001, EP0002, ...
  name: string;      // Nombres Completos
  status: EmployeeStatus;
  area?: string;     // Área (catálogo ENGAGEMENT_AREAS)
  hireDate?: string; // Fecha Ingreso (ISO)
  birthDate?: string;// Fecha Nacimiento (ISO)
  dni?: string;      // DNI
  position?: string; // Cargo
  // Participación indexada por id de evento.
  participation: Record<string, ParticipationStatus>;
}

// =============================================================================
// MERCH — Órdenes de compra (merch / snacks)
// =============================================================================

export const PRODUCT_TYPES = ['Merch', 'Snacks'] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];

export const PRODUCT_TYPE_COLORS: Record<string, string> = {
  Merch: '#0E7A6B',   // verde brand
  Snacks: '#6D28D9',  // violeta
};

export interface PurchaseOrder {
  id: string;            // record id interno
  orderId: string;       // ID COMPRA (C-001, ...)
  purchaseDate?: string; // Fecha de Compra (ISO)
  productType: string;   // Tipo de producto (Merch | Snacks)
  article: string;       // Artículo
  photoUrl?: string;     // Foto (URL opcional)
  unitPrice?: number;    // Precio unit
  qtyOrdered?: number;   // Cantidad Comprada
  totalPrice?: number;   // Precio Total
  qtyArrived?: number;   // Cantidad Llegada
  qtyRemaining?: number; // Cantidad Restante
  endDate?: string;      // Fecha de Termino (ISO)
  supplier?: string;     // Proveedor
  contact?: string;      // Contacto
  comments?: string;     // Comentarios
}

// Ocasiones de uso del merch (catálogo fijo, editable por celda/form).
export const MERCH_OCCASIONS = [
  'Focus Group',
  'Regalo',
  'Prestamos a Comercial',
] as const;
export type MerchOccasion = (typeof MERCH_OCCASIONS)[number];

export const MERCH_OCCASION_COLORS: Record<string, string> = {
  'Focus Group': '#0E7A6B',          // verde
  Regalo: '#CA8A04',                 // ámbar
  'Prestamos a Comercial': '#D14646',// rojo
};

// Uso/consumo de un artículo, referenciando la orden de compra de origen.
export interface MerchUsage {
  id: string;            // record id interno
  usageDate?: string;    // Fecha (ISO)
  orderId: string;       // ID COMPRA USADO -> PurchaseOrder.orderId
  quantity?: number;     // Cantidad
  unitPrice?: number;    // Precio Unit (snapshot de la orden)
  totalAmount?: number;  // Monto total (cantidad × precio unit)
  occasion?: string;     // Ocasión
  comments?: string;     // Comentarios
}

// Gastos extra de merch que NO consumen stock (transporte, envío, etc.).
export const MERCH_EXPENSE_TYPES = [
  'Transporte',
  'Envio',
  'Impresion',
  'Almacenaje',
  'Otro',
] as const;
export type MerchExpenseType = (typeof MERCH_EXPENSE_TYPES)[number];

export const MERCH_EXPENSE_TYPE_COLORS: Record<string, string> = {
  Transporte: '#0E7A6B',   // verde
  Envio: '#4453A0',        // azul
  Impresion: '#CA8A04',    // ámbar
  Almacenaje: '#6D28D9',   // violeta
  Otro: '#6B7280',         // gris
};

export interface MerchExtraExpense {
  id: string;            // record id interno
  name?: string;         // Nombre de Gasto
  expenseType?: string;  // Tipo de Gasto
  date?: string;         // Fecha (ISO)
  occasion?: string;     // Ocasión
  event?: string;        // Evento Específico
  amount?: number;       // Monto
}

// =============================================================================
// Bienestar & Salud — Exámenes médicos
// =============================================================================

export const EXAM_SEDES = [
  'Callao',
  'Lima Norte',
  'Lima Sur',
  'Lima Centro',
  'Lima Este',
  'Sin asignar',
] as const;
export type ExamSede = (typeof EXAM_SEDES)[number];

export const EXAM_STATUSES = ['Sin asignar', 'Programado', 'Reprogramado'] as const;
export type ExamStatus = (typeof EXAM_STATUSES)[number];

export const EXAM_RESULTS = [
  'Apto',
  'Apto con observaciones',
  'Con observaciones',
] as const;
export type ExamResult = (typeof EXAM_RESULTS)[number];

export const EXAM_STATUS_COLORS: Record<string, string> = {
  'Sin asignar': '#94A3B8',
  Programado: '#00A29B',
  Reprogramado: '#CA8A04',
};
export const EXAM_RESULT_COLORS: Record<string, string> = {
  Apto: '#00A29B', // teal
  'Apto con observaciones': '#00665F', // teal más oscuro que Apto
  'Con observaciones': '#D14646', // rojo
};

// Precio del examen según edad (mayor de 39 años cuesta más).
export const EXAM_PRICE_OVER_39 = 77.86;
export const EXAM_PRICE_UNDER_39 = 62.54;

export interface MedicalExam {
  id: string;               // record id interno
  collaboratorId: string;   // ref al colaborador (record id)
  collaboratorName: string; // snapshot del nombre
  examDate?: string;        // Fecha de Examen (ISO)
  sede?: string;            // Sede
  status?: string;          // Status
  resultado?: string;       // Resultado
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  entity: string;
  entityId?: string;
  detail?: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  title: string;
  body?: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: string;
  href?: string;
}

// =============================================================================
// Dashboard
// =============================================================================

export interface DashboardKPI {
  totalCandidates: number;
  newThisWeek: number;
  activeVacancies: number;
  hiresThisMonth: number;
  conversionRate: number;
  avgTimeToHireDays: number;
  trendCandidates: number;
  trendHires: number;
}

export interface SeriesPoint {
  label: string;
  value: number;
}

// =============================================================================
// Pagos — pagos fijos mensuales (servicios, alquileres, seguros, etc.)
// =============================================================================

export const PAYMENT_STATUSES = [
  'Pendiente',
  'Programado',
  'Parcial',
  'Automatico',
  'Listo',
  'No se realizo',
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_STATUS_COLORS: Record<string, string> = {
  Pendiente: '#D14646', // rojo
  Programado: '#7C3AED', // morado
  Parcial: '#2563EB', // azul
  Automatico: '#0891B2', // cian
  Listo: '#22C55E', // verde claro
  'No se realizo': '#94A3B8', // gris
};

// 12 meses (keys estables + label corto para columnas/Airtable + nombre completo).
export const PAYMENT_MONTHS = [
  { key: 'ene', label: 'Ene', full: 'Enero' },
  { key: 'feb', label: 'Feb', full: 'Febrero' },
  { key: 'mar', label: 'Mar', full: 'Marzo' },
  { key: 'abr', label: 'Abr', full: 'Abril' },
  { key: 'may', label: 'May', full: 'Mayo' },
  { key: 'jun', label: 'Jun', full: 'Junio' },
  { key: 'jul', label: 'Jul', full: 'Julio' },
  { key: 'ago', label: 'Ago', full: 'Agosto' },
  { key: 'sep', label: 'Sep', full: 'Septiembre' },
  { key: 'oct', label: 'Oct', full: 'Octubre' },
  { key: 'nov', label: 'Nov', full: 'Noviembre' },
  { key: 'dic', label: 'Dic', full: 'Diciembre' },
] as const;
export type PaymentMonthKey = (typeof PAYMENT_MONTHS)[number]['key'];

export const DEFAULT_PAYMENT_STATUS: PaymentStatus = 'Pendiente';

export interface FixedPayment {
  id: string;             // record id interno
  name: string;           // Nombre de pago
  provider?: string;      // Proveedor
  partida?: string;       // Partida
  sender?: string;        // Quien suele enviarlo
  paymentDate?: string;   // Fecha de pago (texto libre: "12", "1-3", etc.)
  // Estado por mes; un mes ausente se considera "Pendiente".
  status: Record<string, PaymentStatus>;
  // Fecha (ISO) en que se marcó "Programado" cada mes. Clave = mes.
  scheduledAt?: Record<string, string>;
  // Fecha real (YYYY-MM-DD) en que efectivamente se pagó cada mes. Clave = mes.
  paidAt?: Record<string, string>;
}

// RHE — Recibos por Honorarios Electrónicos (personas pagadas por honorarios).
// Misma lógica de estado por mes que los pagos fijos.
export interface RheEntry {
  id: string;
  personStatus?: string;  // Status: Activo / Cese
  person: string;         // Persona (nombre)
  contact?: string;       // Email / WhatsApp / referencia (segunda línea)
  area?: string;          // Áreas
  partida?: string;       // Partida
  entity?: string;        // Entidad (ej. BK)
  paymentDate?: string;   // Fecha de pago (texto libre)
  // Estado de pago por mes; un mes ausente se considera "Pendiente".
  status: Record<string, PaymentStatus>;
  // Fecha (ISO) en que se marcó "Programado" cada mes. Clave = mes.
  scheduledAt?: Record<string, string>;
  // Fecha real (YYYY-MM-DD) en que efectivamente se pagó cada mes. Clave = mes.
  paidAt?: Record<string, string>;
}

// Gasto puntual asociado a un evento de engagement, en un mes dado.
export interface EngagementExpense {
  id: string;
  eventId: string;       // id del evento de engagement
  eventName?: string;    // snapshot del nombre del evento
  month: string;         // clave de mes (ene..dic, ver PAYMENT_MONTHS)
  name: string;          // Nombre de gasto
  amount?: number;       // Monto gastado
}

// Asistencia a una reserva de escritorio (Sitios / Desk Buddy). Dato propio:
// marca si la persona que reservó efectivamente llegó. Clave = reservationId.
export const SITIO_ATTENDANCE_STATUSES = ['Llegó', 'No llegó'] as const;
export type SitioAttendanceStatus = (typeof SITIO_ATTENDANCE_STATUSES)[number];

export interface SitioAttendance {
  id: string;             // record id interno (Airtable)
  reservationId: string;  // id de la reserva en Desk Buddy (Supabase)
  date?: string;          // YYYY-MM-DD (snapshot)
  person?: string;        // nombre (snapshot)
  desk?: string;          // número de escritorio (snapshot)
  floor?: number;         // piso (snapshot)
  status: SitioAttendanceStatus;
}
