// Interfaz unica de repositorio. Implementaciones: mock (memoria) y airtable.
// Toda la app consume `repo` — cambiar DATA_SOURCE alterna la implementacion.

import { env } from '@/lib/env';
import type {
  ActivityLog,
  Candidate,
  CatalogItem,
  CatalogType,
  EngagementEvent,
  EngagementExpense,
  EngagementParticipant,
  FixedPayment,
  RheEntry,
  Ingreso,
  MedicalExam,
  MerchExtraExpense,
  MerchUsage,
  PurchaseOrder,
  Notification,
  ReviewTime,
  SalaryRange,
  SitioAttendance,
  Source,
  Stage,
  StageMovement,
  User,
  Vacancy,
} from '@/lib/types';

export interface CandidateFilter {
  search?: string;
  stage?: string;
  source?: string;
  vacancyId?: string;
  recruiter?: string;
  finalStatus?: string;
}

export interface VacancyFilter {
  search?: string;
  status?: string;
  area?: string;
  priority?: string;
}

export interface Repository {
  // Users (auth — almacenados localmente, no en Airtable)
  listUsers(): Promise<User[]>;
  getUserByEmail(email: string): Promise<User | null>;
  getUserById(id: string): Promise<User | null>;
  createUser(data: Omit<User, 'id' | 'createdAt'> & { password: string }): Promise<User>;
  updateUser(id: string, patch: Partial<User> & { password?: string }): Promise<User>;
  deleteUser(id: string): Promise<void>;
  recordLogin(id: string): Promise<void>;

  // Candidates
  listCandidates(filter?: CandidateFilter): Promise<Candidate[]>;
  getCandidate(id: string): Promise<Candidate | null>;
  createCandidate(
    data: Omit<Candidate, 'id' | 'recordId' | 'appliedAt'> & { appliedAt?: string },
  ): Promise<Candidate>;
  updateCandidate(id: string, patch: Partial<Candidate>): Promise<Candidate>;
  deleteCandidate(id: string): Promise<void>;
  moveCandidateStage(id: string, stage: Stage): Promise<Candidate>;

  // Vacancies
  listVacancies(filter?: VacancyFilter): Promise<Vacancy[]>;
  getVacancy(id: string): Promise<Vacancy | null>;
  createVacancy(
    data: Omit<Vacancy, 'id' | 'recordId' | 'openedAt'> & { openedAt?: string },
  ): Promise<Vacancy>;
  updateVacancy(id: string, patch: Partial<Vacancy>): Promise<Vacancy>;
  deleteVacancy(id: string): Promise<void>;

  // Stage movements (historial) — editable
  listStageMovements(candidateId?: string): Promise<StageMovement[]>;
  createStageMovement(
    data: Omit<StageMovement, 'id' | 'recordId'> & { id?: string },
  ): Promise<StageMovement>;
  updateStageMovement(
    id: string,
    patch: Partial<StageMovement>,
  ): Promise<StageMovement>;
  deleteStageMovement(id: string): Promise<void>;

  // Sources (canales de adquisicion por vacante) — editable
  listSources(): Promise<Source[]>;
  createSource(data: Omit<Source, 'id'>): Promise<Source>;
  updateSource(recordId: string, patch: Partial<Source>): Promise<Source>;
  deleteSource(recordId: string): Promise<void>;

  // Ingresos (onboarding) — editable
  listIngresos(): Promise<Ingreso[]>;
  createIngreso(data: Omit<Ingreso, 'id'>): Promise<Ingreso>;
  updateIngreso(recordId: string, patch: Partial<Ingreso>): Promise<Ingreso>;
  deleteIngreso(recordId: string): Promise<void>;

  // Rango salarial por vacante — editable
  listSalaryRanges(): Promise<SalaryRange[]>;
  createSalaryRange(
    data: Omit<SalaryRange, 'id'>,
  ): Promise<SalaryRange>;
  updateSalaryRange(
    recordId: string,
    patch: Partial<SalaryRange>,
  ): Promise<SalaryRange>;
  deleteSalaryRange(recordId: string): Promise<void>;

  // Tiempo de revisión por hiring manager / candidato — editable
  listReviewTimes(): Promise<ReviewTime[]>;
  createReviewTime(data: Omit<ReviewTime, 'id'>): Promise<ReviewTime>;
  updateReviewTime(recordId: string, patch: Partial<ReviewTime>): Promise<ReviewTime>;
  deleteReviewTime(recordId: string): Promise<void>;

  // Engagement & Cultura — eventos + participación (persistido fuera de Airtable)
  listEngagementEvents(): Promise<EngagementEvent[]>;
  createEngagementEvent(data: Omit<EngagementEvent, 'id'>): Promise<EngagementEvent>;
  updateEngagementEvent(
    id: string,
    patch: Partial<Omit<EngagementEvent, 'id'>>,
  ): Promise<EngagementEvent>;
  deleteEngagementEvent(id: string): Promise<void>;

  // Áreas de engagement (catálogo editable, persistido fuera de Airtable)
  listEngagementAreas(): Promise<CatalogItem[]>;
  createEngagementArea(name: string): Promise<CatalogItem>;
  updateEngagementArea(id: string, name: string): Promise<CatalogItem>;
  deleteEngagementArea(id: string): Promise<void>;

  // Eventos propios del módulo de gastos de engagement (catálogo)
  listEngagementGastoEventos(): Promise<CatalogItem[]>;
  createEngagementGastoEvento(name: string): Promise<CatalogItem>;
  deleteEngagementGastoEvento(id: string): Promise<void>;

  // Gastos por evento de engagement
  listEngagementExpenses(): Promise<EngagementExpense[]>;
  createEngagementExpense(data: Omit<EngagementExpense, 'id'>): Promise<EngagementExpense>;
  updateEngagementExpense(
    id: string,
    patch: Partial<Omit<EngagementExpense, 'id'>>,
  ): Promise<EngagementExpense>;
  deleteEngagementExpense(id: string): Promise<void>;

  listEngagementParticipants(): Promise<EngagementParticipant[]>;
  createEngagementParticipant(
    data: Omit<EngagementParticipant, 'id'>,
  ): Promise<EngagementParticipant>;
  updateEngagementParticipant(
    id: string,
    patch: Partial<Omit<EngagementParticipant, 'id'>>,
  ): Promise<EngagementParticipant>;
  deleteEngagementParticipant(id: string): Promise<void>;

  // MERCH — órdenes de compra (persistido fuera de Airtable)
  listPurchaseOrders(): Promise<PurchaseOrder[]>;
  createPurchaseOrder(data: Omit<PurchaseOrder, 'id'>): Promise<PurchaseOrder>;
  updatePurchaseOrder(
    id: string,
    patch: Partial<Omit<PurchaseOrder, 'id'>>,
  ): Promise<PurchaseOrder>;
  deletePurchaseOrder(id: string): Promise<void>;

  listMerchUsages(): Promise<MerchUsage[]>;
  createMerchUsage(data: Omit<MerchUsage, 'id'>): Promise<MerchUsage>;
  updateMerchUsage(
    id: string,
    patch: Partial<Omit<MerchUsage, 'id'>>,
  ): Promise<MerchUsage>;
  deleteMerchUsage(id: string): Promise<void>;

  // MERCH — gastos extra (no consumen stock: transporte, envío, etc.)
  listMerchExtraExpenses(): Promise<MerchExtraExpense[]>;
  createMerchExtraExpense(
    data: Omit<MerchExtraExpense, 'id'>,
  ): Promise<MerchExtraExpense>;
  updateMerchExtraExpense(
    id: string,
    patch: Partial<Omit<MerchExtraExpense, 'id'>>,
  ): Promise<MerchExtraExpense>;
  deleteMerchExtraExpense(id: string): Promise<void>;

  // Tipo de producto (catálogo editable de Merch)
  listMerchProductTypes(): Promise<CatalogItem[]>;
  createMerchProductType(name: string): Promise<CatalogItem>;
  updateMerchProductType(id: string, name: string): Promise<CatalogItem>;
  deleteMerchProductType(id: string): Promise<void>;

  // Pagos fijos mensuales
  listFixedPayments(): Promise<FixedPayment[]>;
  createFixedPayment(data: Omit<FixedPayment, 'id'>): Promise<FixedPayment>;
  updateFixedPayment(
    id: string,
    patch: Partial<Omit<FixedPayment, 'id'>>,
  ): Promise<FixedPayment>;
  deleteFixedPayment(id: string): Promise<void>;

  // RHE — recibos por honorarios
  listRheEntries(): Promise<RheEntry[]>;
  createRheEntry(data: Omit<RheEntry, 'id'>): Promise<RheEntry>;
  updateRheEntry(
    id: string,
    patch: Partial<Omit<RheEntry, 'id'>>,
  ): Promise<RheEntry>;
  deleteRheEntry(id: string): Promise<void>;

  // Sitios — asistencia (Llegó / No llegó) por reserva de Desk Buddy
  listSitioAttendance(): Promise<SitioAttendance[]>;
  // Upsert por reservationId; status null/'' borra la marca.
  setSitioAttendance(
    data: Omit<SitioAttendance, 'id' | 'status'> & {
      status: SitioAttendance['status'] | null;
    },
  ): Promise<SitioAttendance | null>;

  // Bienestar & Salud — exámenes médicos (persistido fuera de Airtable en mock)
  listMedicalExams(): Promise<MedicalExam[]>;
  createMedicalExam(data: Omit<MedicalExam, 'id'>): Promise<MedicalExam>;
  updateMedicalExam(
    id: string,
    patch: Partial<Omit<MedicalExam, 'id'>>,
  ): Promise<MedicalExam>;
  deleteMedicalExam(id: string): Promise<void>;

  // Catalogos maestros (Seniorities, Hiring Managers, Reclutadores)
  listCatalog(type: CatalogType): Promise<CatalogItem[]>;
  createCatalogItem(type: CatalogType, name: string): Promise<CatalogItem>;
  updateCatalogItem(
    type: CatalogType,
    id: string,
    name: string,
  ): Promise<CatalogItem>;
  deleteCatalogItem(type: CatalogType, id: string): Promise<void>;

  // Activity (local, no Airtable)
  listActivity(limit?: number): Promise<ActivityLog[]>;
  logActivity(entry: Omit<ActivityLog, 'id' | 'createdAt'>): Promise<void>;

  // Notifications (local)
  listNotifications(): Promise<Notification[]>;
  markNotificationRead(id: string): Promise<void>;
  markAllNotificationsRead(): Promise<void>;
  pushNotification(n: Omit<Notification, 'id' | 'createdAt' | 'read'>): Promise<Notification>;

  // Meta
  source(): 'mock' | 'airtable';
  health(): Promise<{ ok: boolean; detail?: string; source: 'mock' | 'airtable' }>;
}

let _impl: Repository | null = null;

export async function getRepo(): Promise<Repository> {
  if (_impl) return _impl;
  if (env.dataSource === 'airtable') {
    const { AirtableRepository } = await import('./airtable');
    _impl = new AirtableRepository();
  } else {
    const { MockRepository } = await import('./mock');
    _impl = new MockRepository();
  }
  return _impl;
}

export function resetRepoCache() {
  _impl = null;
}
