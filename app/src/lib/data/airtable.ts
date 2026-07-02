// Repositorio Airtable real — mapeado al esquema de Baldecash (base appGRC5rRH4m1I8g2).
//
// Auth, actividad, usuarios y notificaciones permanecen LOCALES (modo mock-store),
// porque tu base no tiene tablas de Usuarios/Actividad/Notificaciones.
// Las tablas Candidatos, Vacantes, Etapas, Eventos, Fuentes, Ingresos se leen/escriben en Airtable.

import Airtable, { type FieldSet } from 'airtable';
import { env } from '@/lib/env';
import { PAYMENT_MONTHS } from '@/lib/types';
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
  MedicalExam,
  MerchExtraExpense,
  MerchUsage,
  PurchaseOrder,
  EtapaResultado,
  FinalStatus,
  Fuente,
  Ingreso,
  Modalidad,
  Notification,
  Priority,
  ReviewTime,
  SalaryRange,
  SitioAttendance,
  Source,
  Stage,
  StageMovement,
  User,
  Vacancy,
  VacancyStatus,
} from '@/lib/types';
import type {
  CandidateFilter,
  Repository,
  VacancyFilter,
} from './repository';

// Mapeo de los catalogos maestros a sus tablas/campos en Airtable.
const CATALOG_TABLES: Record<
  CatalogType,
  { tableId: string; idField: string; nameField: string; idPrefix: string }
> = {
  seniorities: {
    tableId: 'tbly6jLyGh0zn1J4N',
    idField: 'ID_Senioritie',
    nameField: 'Seniority',
    idPrefix: 'S',
  },
  'hiring-managers': {
    tableId: 'tblvkjugKSzAqwpss',
    idField: 'ID_Manager',
    nameField: 'Hiring Manager',
    idPrefix: 'HM',
  },
  recruiters: {
    tableId: 'tbljOWSjxp2buFBni',
    idField: 'ID_Reclutador',
    nameField: 'Reclutador',
    idPrefix: 'R',
  },
};
import { MockRepository } from './mock';

// Tablas de Engagement y Merch creadas vía Metadata API (fuente de verdad).
const ENGAGEMENT_TABLES = {
  areas: 'tblUiFvvq0qOcyK7r',
  events: 'tbldSZKz185oQnQLM',
  participants: 'tbl0Dajc7XNSr73Nb',
  expenses: 'tblhDLnl7wAq3zCEo',
  gastoEventos: 'tbll09qOICsGOUxIk',
};
const MERCH_TABLES = {
  orders: 'tblIqM8tp5ibN8AJv',
  usages: 'tblN3gW1GfgYtyM3E',
  expenses: 'tblEfxWHje0xMJYI7',
};
const PAGOS_TABLE = 'tblX3EuRiGsY72tSS';
const RHE_TABLE = 'tblzGSgMmOXBUEdA1';
const BIENESTAR_EXAMS_TABLE = 'tbl8TGQOE2JAR0c28';
const SITIOS_ASISTENCIA_TABLE = 'tbleLMLKC6Xti4AHl';
const PARTICIPATION_CHOICES = [
  'Participo',
  'No Participo',
  'No Aplica',
  'Aun No Participa',
];

// ============================================================================
// Mapeo de campos (nombre dominio -> nombre Airtable)
// ============================================================================
const F = {
  vacancy: {
    id: 'ID_Vacante',
    title: 'Puesto',
    area: 'Área',
    seniority: 'Seniority',
    recruiter: 'Reclutador',
    hiringManager: 'Hiring Manager',
    openedAt: 'Fecha Apertura',
    closedAt: 'Fecha Cierre',
    status: 'Estado Vacante',
    priority: 'Prioridad',
    modalidad: 'Modalidad',
    positions: 'Cantidad Posiciones',
    reopens: 'Veces Reabierta',
    reopenReason: 'Motivo Reapertura',
  },
  candidate: {
    id: 'ID_Candidato',
    name: 'Nombre Completo',
    email: 'Email',
    phone: 'Teléfono',
    linkedinUrl: 'LinkedIn URL',
    vacancyId: 'ID Vacante',
    source: 'Fuente',
    appliedAt: 'Fecha Postulación',
    recruiter: 'Reclutador',
    stage: 'Etapa Actual',
    finalStatus: 'Estado Final',
    dropReason: 'Motivo Caída',
    hired: 'Contratado',
  },
  stage: {
    id: 'ID Movimiento',
    candidateId: 'ID Candidato',
    vacancyId: 'ID Vacante',
    stage: 'Etapa',
    startedAt: 'Fecha Inicio',
    endedAt: 'Fecha Fin',
    result: 'Resultado',
    comments: 'Comentarios',
  },
  source: {
    sourceId: 'ID Fuentes',
    vacancyId: 'ID VACANTE',
    name: 'Fuente',
    cost: 'Costo Mensual',
    owner: 'Responsable',
  },
  ingreso: {
    candidateId: 'ID Candidato',
    finalSalary: 'Salario final',
    startDate: 'Fecha Ingreso',
    stillEmployed: 'Sigue en Empresa',
    endDate: 'Fecha Salida',
    passedProbation: 'Pasó Periodo Prueba',
    performance: 'Performance',
    leaderComment: 'Comentario Líder',
  },
  salaryRange: {
    vacancyId: 'ID VACANTE',
    min: 'SALARIO MINIMO',
    max: 'SALARIO MAXIMO',
    status: 'Status',
  },
  reviewTime: {
    reviewId: 'ID Revision',
    candidateId: 'ID Candidato',
    cvSentAt: 'Fecha de envio de cv',
    returnedAt: 'Fecha de Retorno de CV',
    headName: 'Hiring Manager',
  },
};

function str(f: FieldSet, k: string): string | undefined {
  const v = f[k];
  return typeof v === 'string' ? v : v == null ? undefined : String(v);
}
function num(f: FieldSet, k: string): number | undefined {
  const v = f[k];
  return typeof v === 'number' ? v : undefined;
}
function bool(f: FieldSet, k: string): boolean | undefined {
  const v = f[k];
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') return v.toLowerCase() === 'sí' || v.toLowerCase() === 'si' || v === 'true';
  return undefined;
}

export class AirtableRepository implements Repository {
  private base: Airtable.Base;
  // Las funciones de auth/actividad/notificaciones siguen siendo locales
  private local = new MockRepository();

  constructor() {
    Airtable.configure({ apiKey: env.airtable.token });
    this.base = Airtable.base(env.airtable.baseId);
  }

  source(): 'mock' | 'airtable' {
    return 'airtable';
  }

  async health() {
    try {
      await this.base(env.airtable.tables.vacancies)
        .select({ pageSize: 1 })
        .firstPage();
      return { ok: true, detail: 'airtable connected', source: 'airtable' as const };
    } catch (e: any) {
      return {
        ok: false,
        detail: `airtable error: ${e?.message || 'unknown'}`,
        source: 'airtable' as const,
      };
    }
  }

  // ---- Helpers ----
  private async selectAll(
    table: string,
    opts: Airtable.SelectOptions<FieldSet> = {},
  ): Promise<Airtable.Record<FieldSet>[]> {
    const all: Airtable.Record<FieldSet>[] = [];
    await this.base(table)
      .select(opts)
      .eachPage((records, next) => {
        all.push(...records);
        next();
      });
    return all;
  }

  // ============================================================
  // Vacantes
  // ============================================================
  private vacancyFromRecord(r: Airtable.Record<FieldSet>): Vacancy {
    const f = r.fields;
    return {
      id: str(f, F.vacancy.id) || r.id,
      recordId: r.id,
      title: str(f, F.vacancy.title) || '—',
      area: str(f, F.vacancy.area) || '',
      seniority: str(f, F.vacancy.seniority),
      recruiter: str(f, F.vacancy.recruiter),
      hiringManager: str(f, F.vacancy.hiringManager),
      openedAt: str(f, F.vacancy.openedAt) || new Date().toISOString(),
      closedAt: str(f, F.vacancy.closedAt),
      status: (str(f, F.vacancy.status) as VacancyStatus) || 'Abierta',
      priority: (str(f, F.vacancy.priority) as Priority) || 'Media',
      modalidad: str(f, F.vacancy.modalidad) as Modalidad | undefined,
      positions: num(f, F.vacancy.positions) ?? 1,
      reopens: num(f, F.vacancy.reopens) ?? 0,
      reopenReason: str(f, F.vacancy.reopenReason),
    };
  }

  async listVacancies(filter?: VacancyFilter) {
    const records = await this.selectAll(env.airtable.tables.vacancies);
    let list = records
      .map((r) => this.vacancyFromRecord(r))
      .filter((v) => v.title && v.title.trim() !== '' && v.title !== '—');
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      list = list.filter(
        (v) =>
          v.title.toLowerCase().includes(q) ||
          v.id.toLowerCase().includes(q) ||
          (v.area || '').toLowerCase().includes(q),
      );
    }
    if (filter?.status) list = list.filter((v) => v.status === filter.status);
    if (filter?.area) list = list.filter((v) => v.area === filter.area);
    if (filter?.priority) list = list.filter((v) => v.priority === filter.priority);
    return list.sort((a, b) => (a.openedAt < b.openedAt ? 1 : -1));
  }

  async getVacancy(id: string) {
    const records = await this.selectAll(env.airtable.tables.vacancies, {
      filterByFormula: `{${F.vacancy.id}} = "${id}"`,
      maxRecords: 1,
    });
    return records[0] ? this.vacancyFromRecord(records[0]) : null;
  }

  // Siguiente ID autoincremental con formato VCNNNN (VC0001, VC0002, ...).
  // Ignora IDs con otros formatos (ej. VAC-1234) para el calculo del max.
  private async nextVacancyId(): Promise<string> {
    const records = await this.selectAll(env.airtable.tables.vacancies);
    let maxN = 0;
    for (const r of records) {
      const idStr = String(r.fields[F.vacancy.id] || '');
      const m = idStr.match(/^VC(\d{1,})$/);
      if (m) {
        const n = parseInt(m[1], 10);
        if (Number.isFinite(n) && n > maxN) maxN = n;
      }
    }
    return `VC${String(maxN + 1).padStart(4, '0')}`;
  }

  async createVacancy(data: any) {
    const newId = data.id || (await this.nextVacancyId());
    const r = (await this.base(env.airtable.tables.vacancies).create(
      {
        [F.vacancy.id]: newId,
        [F.vacancy.title]: data.title,
        [F.vacancy.area]: data.area,
        [F.vacancy.seniority]: data.seniority,
        [F.vacancy.recruiter]: data.recruiter,
        [F.vacancy.hiringManager]: data.hiringManager,
        [F.vacancy.openedAt]: data.openedAt || new Date().toISOString().slice(0, 10),
        [F.vacancy.status]: data.status || 'Abierta',
        [F.vacancy.priority]: data.priority || 'Media',
        [F.vacancy.modalidad]: data.modalidad,
        [F.vacancy.positions]: data.positions ?? 1,
      } as any,
      { typecast: true },
    )) as unknown as Airtable.Record<FieldSet>;
    return this.vacancyFromRecord(r);
  }

  async updateVacancy(id: string, patch: Partial<Vacancy>) {
    const found = await this.findVacancyRecordId(id);
    if (!found) throw new Error('Vacante no encontrada');
    const fields: Record<string, any> = {};
    if (patch.title !== undefined) fields[F.vacancy.title] = patch.title;
    if (patch.area !== undefined) fields[F.vacancy.area] = patch.area;
    if (patch.seniority !== undefined) fields[F.vacancy.seniority] = patch.seniority;
    if (patch.recruiter !== undefined) fields[F.vacancy.recruiter] = patch.recruiter;
    if (patch.hiringManager !== undefined) fields[F.vacancy.hiringManager] = patch.hiringManager;
    if (patch.openedAt !== undefined) fields[F.vacancy.openedAt] = patch.openedAt;
    if (patch.closedAt !== undefined) fields[F.vacancy.closedAt] = patch.closedAt;
    if (patch.status !== undefined) fields[F.vacancy.status] = patch.status;
    if (patch.priority !== undefined) fields[F.vacancy.priority] = patch.priority;
    if (patch.modalidad !== undefined) fields[F.vacancy.modalidad] = patch.modalidad;
    if (patch.positions !== undefined) fields[F.vacancy.positions] = patch.positions;
    const r = (await this.base(env.airtable.tables.vacancies).update(
      found,
      fields,
      { typecast: true },
    )) as unknown as Airtable.Record<FieldSet>;
    return this.vacancyFromRecord(r);
  }

  async deleteVacancy(id: string) {
    const found = await this.findVacancyRecordId(id);
    if (found) await this.base(env.airtable.tables.vacancies).destroy(found);
  }

  private async findVacancyRecordId(id: string): Promise<string | null> {
    const records = await this.selectAll(env.airtable.tables.vacancies, {
      filterByFormula: `{${F.vacancy.id}} = "${id}"`,
      maxRecords: 1,
    });
    return records[0]?.id ?? null;
  }

  // ============================================================
  // Candidatos
  // ============================================================
  private candidateFromRecord(r: Airtable.Record<FieldSet>): Candidate {
    const f = r.fields;
    return {
      id: str(f, F.candidate.id) || r.id,
      recordId: r.id,
      name: str(f, F.candidate.name) || '—',
      email: str(f, F.candidate.email),
      phone: str(f, F.candidate.phone),
      linkedinUrl: str(f, F.candidate.linkedinUrl),
      vacancyId: str(f, F.candidate.vacancyId),
      source: (str(f, F.candidate.source) as Fuente) || 'LinkedIn',
      appliedAt: str(f, F.candidate.appliedAt) || '',
      recruiter: str(f, F.candidate.recruiter),
      stage: (str(f, F.candidate.stage) as Stage) || 'Screening',
      finalStatus: (str(f, F.candidate.finalStatus) as FinalStatus) || 'En proceso',
      dropReason: str(f, F.candidate.dropReason),
      hired: bool(f, F.candidate.hired),
    };
  }

  async listCandidates(filter?: CandidateFilter) {
    const records = await this.selectAll(env.airtable.tables.candidates);
    let list = records
      .map((r) => this.candidateFromRecord(r))
      // Filtra ghost records: registros vacíos en Airtable (sin nombre real)
      .filter((c) => c.name && c.name.trim() !== '' && c.name !== '—');
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q) ||
          (c.recruiter || '').toLowerCase().includes(q),
      );
    }
    if (filter?.stage) list = list.filter((c) => c.stage === filter.stage);
    if (filter?.source) list = list.filter((c) => c.source === filter.source);
    if (filter?.vacancyId) list = list.filter((c) => c.vacancyId === filter.vacancyId);
    if (filter?.recruiter) list = list.filter((c) => c.recruiter === filter.recruiter);
    if (filter?.finalStatus) list = list.filter((c) => c.finalStatus === filter.finalStatus);
    return list.sort((a, b) => (a.appliedAt < b.appliedAt ? 1 : -1));
  }

  async getCandidate(id: string) {
    const records = await this.selectAll(env.airtable.tables.candidates, {
      filterByFormula: `{${F.candidate.id}} = "${id}"`,
      maxRecords: 1,
    });
    return records[0] ? this.candidateFromRecord(records[0]) : null;
  }

  // Calcula el siguiente ID autoincremental con formato CNNNN (C0001, C0002, ...)
  // Lee todos los IDs existentes, extrae los que matchean el patron CNNNN y
  // devuelve max+1 con padding a 4 digitos. IDs con otros formatos (ej. CAND-7275)
  // se ignoran en el calculo.
  private async nextCandidateId(): Promise<string> {
    const records = await this.selectAll(env.airtable.tables.candidates);
    let maxN = 0;
    for (const r of records) {
      const idStr = String(r.fields[F.candidate.id] || '');
      const m = idStr.match(/^C(\d{1,})$/);
      if (m) {
        const n = parseInt(m[1], 10);
        if (Number.isFinite(n) && n > maxN) maxN = n;
      }
    }
    return `C${String(maxN + 1).padStart(4, '0')}`;
  }

  async createCandidate(data: any) {
    const newId = data.id || (await this.nextCandidateId());
    const r = (await this.base(env.airtable.tables.candidates).create(
      {
        [F.candidate.id]: newId,
        [F.candidate.name]: data.name,
        [F.candidate.vacancyId]: data.vacancyId,
        [F.candidate.source]: data.source,
        [F.candidate.appliedAt]: data.appliedAt || new Date().toISOString().slice(0, 10),
        [F.candidate.recruiter]: data.recruiter,
        [F.candidate.stage]: data.stage || 'Entrevista T&C',
        [F.candidate.finalStatus]: data.finalStatus || 'En proceso',
      } as any,
      { typecast: true },
    )) as unknown as Airtable.Record<FieldSet>;
    return this.candidateFromRecord(r);
  }

  async updateCandidate(id: string, patch: Partial<Candidate>) {
    const found = await this.findCandidateRecordId(id);
    if (!found) throw new Error('Candidato no encontrado');
    const fields: Record<string, any> = {};
    if (patch.name !== undefined) fields[F.candidate.name] = patch.name;
    if (patch.vacancyId !== undefined) fields[F.candidate.vacancyId] = patch.vacancyId;
    if (patch.source !== undefined) fields[F.candidate.source] = patch.source;
    if (patch.appliedAt !== undefined) fields[F.candidate.appliedAt] = patch.appliedAt;
    if (patch.recruiter !== undefined) fields[F.candidate.recruiter] = patch.recruiter;
    if (patch.stage !== undefined) fields[F.candidate.stage] = patch.stage;
    if (patch.finalStatus !== undefined) fields[F.candidate.finalStatus] = patch.finalStatus;
    if (patch.dropReason !== undefined) fields[F.candidate.dropReason] = patch.dropReason;
    if (patch.hired !== undefined) fields[F.candidate.hired] = patch.hired ? 'Sí' : 'No';
    const r = (await this.base(env.airtable.tables.candidates).update(
      found,
      fields,
      { typecast: true },
    )) as unknown as Airtable.Record<FieldSet>;
    return this.candidateFromRecord(r);
  }

  async deleteCandidate(id: string) {
    const found = await this.findCandidateRecordId(id);
    if (found) await this.base(env.airtable.tables.candidates).destroy(found);
  }

  async moveCandidateStage(id: string, stage: Stage) {
    return this.updateCandidate(id, { stage });
  }

  private async findCandidateRecordId(id: string): Promise<string | null> {
    const records = await this.selectAll(env.airtable.tables.candidates, {
      filterByFormula: `{${F.candidate.id}} = "${id}"`,
      maxRecords: 1,
    });
    return records[0]?.id ?? null;
  }

  // ============================================================
  // Etapas
  // ============================================================
  private movementFromRecord(r: Airtable.Record<FieldSet>): StageMovement {
    const f = r.fields;
    return {
      id: str(f, F.stage.id) || r.id,
      recordId: r.id,
      candidateId: str(f, F.stage.candidateId) || '',
      vacancyId: str(f, F.stage.vacancyId) || '',
      stage: (str(f, F.stage.stage) as Stage) || 'Screening',
      startedAt: str(f, F.stage.startedAt) || '',
      endedAt: str(f, F.stage.endedAt),
      result: str(f, F.stage.result) as EtapaResultado | undefined,
      comments: str(f, F.stage.comments),
    };
  }

  async listStageMovements(candidateId?: string) {
    const opts: Airtable.SelectOptions<FieldSet> = candidateId
      ? { filterByFormula: `{${F.stage.candidateId}} = "${candidateId}"` }
      : {};
    const records = await this.selectAll(env.airtable.tables.stages, opts);
    return records.map((r) => this.movementFromRecord(r));
  }

  private async findMovementRecordId(id: string): Promise<string | null> {
    const records = await this.selectAll(env.airtable.tables.stages, {
      filterByFormula: `{${F.stage.id}} = "${id}"`,
      maxRecords: 1,
    });
    return records[0]?.id ?? null;
  }

  // Siguiente ID autoincremental MV0001, MV0002, ...
  private async nextMovementId(): Promise<string> {
    const records = await this.selectAll(env.airtable.tables.stages);
    let maxN = 0;
    for (const r of records) {
      const idStr = String(r.fields[F.stage.id] || '');
      const m = idStr.match(/^MV(\d{1,})$/);
      if (m) {
        const n = parseInt(m[1], 10);
        if (Number.isFinite(n) && n > maxN) maxN = n;
      }
    }
    return `MV${String(maxN + 1).padStart(4, '0')}`;
  }

  async createStageMovement(data: any) {
    const newId = data.id || (await this.nextMovementId());
    const fields: Record<string, any> = {
      [F.stage.id]: newId,
    };
    if (data.candidateId !== undefined) fields[F.stage.candidateId] = data.candidateId;
    if (data.vacancyId !== undefined) fields[F.stage.vacancyId] = data.vacancyId;
    if (data.stage !== undefined) fields[F.stage.stage] = data.stage;
    if (data.startedAt) fields[F.stage.startedAt] = data.startedAt;
    if (data.endedAt) fields[F.stage.endedAt] = data.endedAt;
    if (data.result !== undefined) fields[F.stage.result] = data.result;
    if (data.comments !== undefined) fields[F.stage.comments] = data.comments;

    const r = (await this.base(env.airtable.tables.stages).create(
      fields as any,
      { typecast: true },
    )) as unknown as Airtable.Record<FieldSet>;
    return this.movementFromRecord(r);
  }

  async updateStageMovement(id: string, patch: Partial<StageMovement>) {
    const found = await this.findMovementRecordId(id);
    if (!found) throw new Error('Movimiento no encontrado');
    const fields: Record<string, any> = {};
    if (patch.candidateId !== undefined) fields[F.stage.candidateId] = patch.candidateId;
    if (patch.vacancyId !== undefined) fields[F.stage.vacancyId] = patch.vacancyId;
    if (patch.stage !== undefined) fields[F.stage.stage] = patch.stage;
    if (patch.startedAt !== undefined) fields[F.stage.startedAt] = patch.startedAt;
    if (patch.endedAt !== undefined) fields[F.stage.endedAt] = patch.endedAt;
    if (patch.result !== undefined) fields[F.stage.result] = patch.result;
    if (patch.comments !== undefined) fields[F.stage.comments] = patch.comments;

    const r = (await this.base(env.airtable.tables.stages).update(
      found,
      fields,
      { typecast: true },
    )) as unknown as Airtable.Record<FieldSet>;
    return this.movementFromRecord(r);
  }

  async deleteStageMovement(id: string) {
    const found = await this.findMovementRecordId(id);
    if (found) await this.base(env.airtable.tables.stages).destroy(found);
  }

  // ============================================================
  // Fuentes (costo por canal por vacante)
  // ============================================================
  async listSources(): Promise<Source[]> {
    const records = await this.selectAll(env.airtable.tables.sources);
    return records
      .map((r) => this.sourceFromRecord(r))
      // Filtra ghost records: sin nombre de fuente real
      .filter((s) => s.name && s.name.trim() !== '' && s.name !== '—');
  }

  private sourceFromRecord(r: Airtable.Record<FieldSet>): Source {
    const f = r.fields;
    return {
      id: r.id, // recordId interno (key estable para CRUD)
      sourceId: str(f, F.source.sourceId),
      vacancyId: str(f, F.source.vacancyId),
      name: str(f, F.source.name) || '—',
      monthlyCost: num(f, F.source.cost),
      owner: str(f, F.source.owner),
    };
  }

  // Siguiente ID autoincremental F0001, F0002, ...
  private async nextSourceId(): Promise<string> {
    const records = await this.selectAll(env.airtable.tables.sources);
    let maxN = 0;
    for (const r of records) {
      const idStr = String(r.fields[F.source.sourceId] || '');
      const m = idStr.match(/^F(\d{1,})$/);
      if (m) {
        const n = parseInt(m[1], 10);
        if (Number.isFinite(n) && n > maxN) maxN = n;
      }
    }
    return `F${String(maxN + 1).padStart(4, '0')}`;
  }

  async createSource(data: Omit<Source, 'id'>): Promise<Source> {
    const newId = data.sourceId || (await this.nextSourceId());
    const fields: Record<string, any> = {
      [F.source.sourceId]: newId,
    };
    if (data.vacancyId !== undefined) fields[F.source.vacancyId] = data.vacancyId;
    if (data.name !== undefined) fields[F.source.name] = data.name;
    if (data.monthlyCost !== undefined) fields[F.source.cost] = data.monthlyCost;
    if (data.owner !== undefined) fields[F.source.owner] = data.owner;
    const r = (await this.base(env.airtable.tables.sources).create(
      fields as any,
      { typecast: true },
    )) as unknown as Airtable.Record<FieldSet>;
    return this.sourceFromRecord(r);
  }

  async updateSource(
    recordId: string,
    patch: Partial<Source>,
  ): Promise<Source> {
    const fields: Record<string, any> = {};
    if (patch.vacancyId !== undefined) fields[F.source.vacancyId] = patch.vacancyId;
    if (patch.name !== undefined) fields[F.source.name] = patch.name;
    if (patch.monthlyCost !== undefined) fields[F.source.cost] = patch.monthlyCost;
    if (patch.owner !== undefined) fields[F.source.owner] = patch.owner;
    const r = (await this.base(env.airtable.tables.sources).update(
      recordId,
      fields,
      { typecast: true },
    )) as unknown as Airtable.Record<FieldSet>;
    return this.sourceFromRecord(r);
  }

  async deleteSource(recordId: string): Promise<void> {
    await this.base(env.airtable.tables.sources).destroy(recordId);
  }

  // ============================================================
  // Ingresos
  // ============================================================
  async listIngresos(): Promise<Ingreso[]> {
    const records = await this.selectAll(env.airtable.tables.ingresos);
    return records
      .map((r) => this.ingresoFromRecord(r))
      // Filtra ghost records (filas vacias en Airtable sin ID Candidato)
      .filter((i) => i.candidateId && i.candidateId.trim() !== '');
  }

  private ingresoFromRecord(r: Airtable.Record<FieldSet>): Ingreso {
    const f = r.fields;
    return {
      id: r.id,
      candidateId: str(f, F.ingreso.candidateId) || '',
      finalSalary: num(f, F.ingreso.finalSalary),
      startDate: str(f, F.ingreso.startDate) || '',
      stillEmployed: bool(f, F.ingreso.stillEmployed),
      endDate: str(f, F.ingreso.endDate),
      passedProbation: bool(f, F.ingreso.passedProbation),
      performance: str(f, F.ingreso.performance),
      leaderComment: str(f, F.ingreso.leaderComment),
    };
  }

  private ingresoFieldsForWrite(data: Partial<Ingreso>): Record<string, any> {
    const fields: Record<string, any> = {};
    if (data.candidateId !== undefined) fields[F.ingreso.candidateId] = data.candidateId;
    if (data.finalSalary !== undefined) fields[F.ingreso.finalSalary] = data.finalSalary;
    if (data.startDate !== undefined) fields[F.ingreso.startDate] = data.startDate;
    // boolean -> 'Sí'/'No'; null -> limpia el campo; undefined -> no se toca
    if (data.stillEmployed !== undefined)
      fields[F.ingreso.stillEmployed] =
        data.stillEmployed === null ? null : data.stillEmployed ? 'Sí' : 'No';
    if (data.endDate !== undefined) fields[F.ingreso.endDate] = data.endDate;
    if (data.passedProbation !== undefined)
      fields[F.ingreso.passedProbation] =
        data.passedProbation === null ? null : data.passedProbation ? 'Sí' : 'No';
    if (data.performance !== undefined) fields[F.ingreso.performance] = data.performance;
    if (data.leaderComment !== undefined) fields[F.ingreso.leaderComment] = data.leaderComment;
    return fields;
  }

  async createIngreso(data: Omit<Ingreso, 'id'>): Promise<Ingreso> {
    const fields = this.ingresoFieldsForWrite(data);
    const r = (await this.base(env.airtable.tables.ingresos).create(
      fields as any,
      { typecast: true },
    )) as unknown as Airtable.Record<FieldSet>;
    return this.ingresoFromRecord(r);
  }

  async updateIngreso(
    recordId: string,
    patch: Partial<Ingreso>,
  ): Promise<Ingreso> {
    const fields = this.ingresoFieldsForWrite(patch);
    const r = (await this.base(env.airtable.tables.ingresos).update(
      recordId,
      fields,
      { typecast: true },
    )) as unknown as Airtable.Record<FieldSet>;
    return this.ingresoFromRecord(r);
  }

  async deleteIngreso(recordId: string): Promise<void> {
    await this.base(env.airtable.tables.ingresos).destroy(recordId);
  }

  // ============================================================
  // Rango salarial por vacante
  // ============================================================
  async listSalaryRanges(): Promise<SalaryRange[]> {
    const records = await this.selectAll(env.airtable.tables.salaryRange);
    return records
      .map((r) => this.salaryRangeFromRecord(r))
      // Filtra ghost records (filas vacias en Airtable sin ID VACANTE).
      .filter((r) => r.vacancyId && r.vacancyId.trim() !== '');
  }

  private salaryRangeFromRecord(r: Airtable.Record<FieldSet>): SalaryRange {
    const f = r.fields;
    return {
      id: r.id, // recordId interno (key estable para CRUD)
      vacancyId: str(f, F.salaryRange.vacancyId) || '',
      min: num(f, F.salaryRange.min),
      max: num(f, F.salaryRange.max),
      status: str(f, F.salaryRange.status),
    };
  }

  async createSalaryRange(data: Omit<SalaryRange, 'id'>): Promise<SalaryRange> {
    const fields: Record<string, any> = {
      [F.salaryRange.vacancyId]: data.vacancyId,
    };
    if (data.min !== undefined) fields[F.salaryRange.min] = data.min;
    if (data.max !== undefined) fields[F.salaryRange.max] = data.max;
    if (data.status !== undefined) fields[F.salaryRange.status] = data.status;
    const r = (await this.base(env.airtable.tables.salaryRange).create(
      fields as any,
      { typecast: true },
    )) as unknown as Airtable.Record<FieldSet>;
    return this.salaryRangeFromRecord(r);
  }

  async updateSalaryRange(
    recordId: string,
    patch: Partial<SalaryRange>,
  ): Promise<SalaryRange> {
    const fields: Record<string, any> = {};
    if (patch.vacancyId !== undefined) fields[F.salaryRange.vacancyId] = patch.vacancyId;
    if (patch.min !== undefined) fields[F.salaryRange.min] = patch.min;
    if (patch.max !== undefined) fields[F.salaryRange.max] = patch.max;
    if (patch.status !== undefined) fields[F.salaryRange.status] = patch.status;
    const r = (await this.base(env.airtable.tables.salaryRange).update(
      recordId,
      fields,
      { typecast: true },
    )) as unknown as Airtable.Record<FieldSet>;
    return this.salaryRangeFromRecord(r);
  }

  async deleteSalaryRange(recordId: string): Promise<void> {
    await this.base(env.airtable.tables.salaryRange).destroy(recordId);
  }

  // ============================================================
  // Tiempo de revisión (head)
  // ============================================================
  async listReviewTimes(): Promise<ReviewTime[]> {
    const records = await this.selectAll(env.airtable.tables.reviewTime);
    return records
      .map((r) => this.reviewTimeFromRecord(r))
      // Filtra ghost records: filas vacias sin candidato ni head
      .filter((rt) => rt.candidateId || rt.headName);
  }

  private reviewTimeFromRecord(r: Airtable.Record<FieldSet>): ReviewTime {
    const f = r.fields;
    return {
      id: r.id, // recordId interno (key estable para CRUD)
      reviewId: str(f, F.reviewTime.reviewId) || r.id,
      candidateId: str(f, F.reviewTime.candidateId),
      cvSentAt: str(f, F.reviewTime.cvSentAt),
      returnedAt: str(f, F.reviewTime.returnedAt),
      headName: str(f, F.reviewTime.headName),
    };
  }

  // Siguiente ID autoincremental RV0001, RV0002, ...
  private async nextReviewId(): Promise<string> {
    const records = await this.selectAll(env.airtable.tables.reviewTime);
    let maxN = 0;
    for (const r of records) {
      const idStr = String(r.fields[F.reviewTime.reviewId] || '');
      const m = idStr.match(/^RV(\d{1,})$/);
      if (m) {
        const n = parseInt(m[1], 10);
        if (Number.isFinite(n) && n > maxN) maxN = n;
      }
    }
    return `RV${String(maxN + 1).padStart(4, '0')}`;
  }

  private reviewTimeFieldsForWrite(data: Partial<ReviewTime>): Record<string, any> {
    const fields: Record<string, any> = {};
    if (data.candidateId !== undefined) fields[F.reviewTime.candidateId] = data.candidateId;
    if (data.cvSentAt !== undefined) fields[F.reviewTime.cvSentAt] = data.cvSentAt;
    if (data.returnedAt !== undefined) fields[F.reviewTime.returnedAt] = data.returnedAt;
    if (data.headName !== undefined) fields[F.reviewTime.headName] = data.headName;
    return fields;
  }

  async createReviewTime(data: Omit<ReviewTime, 'id'>): Promise<ReviewTime> {
    const newId = data.reviewId || (await this.nextReviewId());
    const fields = {
      [F.reviewTime.reviewId]: newId,
      ...this.reviewTimeFieldsForWrite(data),
    };
    const r = (await this.base(env.airtable.tables.reviewTime).create(
      fields as any,
      { typecast: true },
    )) as unknown as Airtable.Record<FieldSet>;
    return this.reviewTimeFromRecord(r);
  }

  async updateReviewTime(
    recordId: string,
    patch: Partial<ReviewTime>,
  ): Promise<ReviewTime> {
    const r = (await this.base(env.airtable.tables.reviewTime).update(
      recordId,
      this.reviewTimeFieldsForWrite(patch),
      { typecast: true },
    )) as unknown as Airtable.Record<FieldSet>;
    return this.reviewTimeFromRecord(r);
  }

  async deleteReviewTime(recordId: string): Promise<void> {
    await this.base(env.airtable.tables.reviewTime).destroy(recordId);
  }

  // ============================================================
  // Catalogos maestros (Seniorities, Hiring Managers, Reclutadores)
  // ============================================================
  async listCatalog(type: CatalogType): Promise<CatalogItem[]> {
    const cfg = CATALOG_TABLES[type];
    const records = await this.selectAll(cfg.tableId);
    return records
      .map((r) => ({
        id: String(r.fields[cfg.idField] || r.id),
        recordId: r.id,
        name: String(r.fields[cfg.nameField] || '').trim(),
      }))
      .filter((c) => c.name);
  }

  private async nextCatalogId(type: CatalogType): Promise<string> {
    const cfg = CATALOG_TABLES[type];
    const records = await this.selectAll(cfg.tableId);
    let maxN = 0;
    const re = new RegExp(`^${cfg.idPrefix}(\\d{1,})$`);
    for (const r of records) {
      const idStr = String(r.fields[cfg.idField] || '');
      const m = idStr.match(re);
      if (m) {
        const n = parseInt(m[1], 10);
        if (Number.isFinite(n) && n > maxN) maxN = n;
      }
    }
    return `${cfg.idPrefix}${String(maxN + 1).padStart(4, '0')}`;
  }

  async createCatalogItem(
    type: CatalogType,
    name: string,
  ): Promise<CatalogItem> {
    const cfg = CATALOG_TABLES[type];
    const newId = await this.nextCatalogId(type);
    const r = (await this.base(cfg.tableId).create(
      {
        [cfg.idField]: newId,
        [cfg.nameField]: name,
      } as any,
      { typecast: true },
    )) as unknown as Airtable.Record<FieldSet>;
    return {
      id: String(r.fields[cfg.idField] || r.id),
      recordId: r.id,
      name: String(r.fields[cfg.nameField] || '').trim(),
    };
  }

  private async findCatalogRecordId(
    type: CatalogType,
    id: string,
  ): Promise<string | null> {
    const cfg = CATALOG_TABLES[type];
    const records = await this.selectAll(cfg.tableId, {
      filterByFormula: `{${cfg.idField}} = "${id}"`,
      maxRecords: 1,
    });
    return records[0]?.id ?? null;
  }

  async updateCatalogItem(
    type: CatalogType,
    id: string,
    name: string,
  ): Promise<CatalogItem> {
    const cfg = CATALOG_TABLES[type];
    const found = await this.findCatalogRecordId(type, id);
    if (!found) throw new Error('Elemento no encontrado');
    const r = (await this.base(cfg.tableId).update(
      found,
      { [cfg.nameField]: name } as any,
      { typecast: true },
    )) as unknown as Airtable.Record<FieldSet>;
    return {
      id: String(r.fields[cfg.idField] || r.id),
      recordId: r.id,
      name: String(r.fields[cfg.nameField] || '').trim(),
    };
  }

  async deleteCatalogItem(type: CatalogType, id: string): Promise<void> {
    const cfg = CATALOG_TABLES[type];
    const found = await this.findCatalogRecordId(type, id);
    if (found) await this.base(cfg.tableId).destroy(found);
  }

  // ============================================================
  // Delegados a la capa local (auth + activity + notif)
  // ============================================================
  listUsers() { return this.local.listUsers(); }
  getUserByEmail(e: string) { return this.local.getUserByEmail(e); }
  getUserById(i: string) { return this.local.getUserById(i); }
  createUser(d: any) { return this.local.createUser(d); }
  updateUser(i: string, p: any) { return this.local.updateUser(i, p); }
  deleteUser(i: string) { return this.local.deleteUser(i); }
  recordLogin(i: string) { return this.local.recordLogin(i); }

  // ============================================================
  // Engagement & Cultura (Airtable: Áreas / Eventos / Colaboradores)
  // ============================================================

  // ---- Áreas ----
  async listEngagementAreas(): Promise<CatalogItem[]> {
    const records = await this.selectAll(ENGAGEMENT_TABLES.areas);
    return records
      .map((r) => ({
        id: r.id,
        recordId: r.id,
        name: str(r.fields, 'Área') || '',
      }))
      .filter((a) => a.name);
  }

  async createEngagementArea(name: string): Promise<CatalogItem> {
    const r = (await this.base(ENGAGEMENT_TABLES.areas).create(
      { 'Área': name } as any,
      { typecast: true },
    )) as unknown as Airtable.Record<FieldSet>;
    return { id: r.id, recordId: r.id, name: str(r.fields, 'Área') || name };
  }

  async updateEngagementArea(id: string, name: string): Promise<CatalogItem> {
    const r = (await this.base(ENGAGEMENT_TABLES.areas).update(
      id,
      { 'Área': name } as any,
      { typecast: true },
    )) as unknown as Airtable.Record<FieldSet>;
    return { id: r.id, recordId: r.id, name: str(r.fields, 'Área') || name };
  }

  async deleteEngagementArea(id: string): Promise<void> {
    await this.base(ENGAGEMENT_TABLES.areas).destroy(id);
  }

  // ---- Eventos ----
  private eventFromRecord(r: Airtable.Record<FieldSet>): EngagementEvent {
    return {
      id: r.id,
      name: str(r.fields, 'Evento') || '',
      date: str(r.fields, 'Fecha'),
    };
  }

  async listEngagementEvents(): Promise<EngagementEvent[]> {
    const records = await this.selectAll(ENGAGEMENT_TABLES.events);
    return records.map((r) => this.eventFromRecord(r)).filter((e) => e.name);
  }

  async createEngagementEvent(
    d: Omit<EngagementEvent, 'id'>,
  ): Promise<EngagementEvent> {
    const r = (await this.base(ENGAGEMENT_TABLES.events).create(
      { Evento: d.name, Fecha: d.date || undefined } as any,
      { typecast: true },
    )) as unknown as Airtable.Record<FieldSet>;
    // "Una columna por evento": crea el campo singleSelect en Colaboradores.
    await this.ensureParticipationField(d.name);
    return this.eventFromRecord(r);
  }

  async updateEngagementEvent(
    id: string,
    p: Partial<Omit<EngagementEvent, 'id'>>,
  ): Promise<EngagementEvent> {
    // Si cambia el nombre, renombra también la columna en Colaboradores.
    let prevName: string | undefined;
    if (p.name !== undefined) {
      const cur = await this.base(ENGAGEMENT_TABLES.events).find(id);
      prevName = str((cur as any).fields, 'Evento');
    }
    const fields: Record<string, any> = {};
    if (p.name !== undefined) fields['Evento'] = p.name;
    if (p.date !== undefined) fields['Fecha'] = p.date || null;
    const r = (await this.base(ENGAGEMENT_TABLES.events).update(id, fields, {
      typecast: true,
    })) as unknown as Airtable.Record<FieldSet>;
    if (p.name !== undefined && prevName && prevName !== p.name) {
      await this.renameParticipationField(prevName, p.name);
    }
    return this.eventFromRecord(r);
  }

  async deleteEngagementEvent(id: string): Promise<void> {
    // Nota: Airtable no permite borrar campos vía API, así que la columna del
    // evento en Colaboradores queda huérfana (la app solo muestra eventos que
    // existan en la tabla Eventos, por lo que se ignora).
    await this.base(ENGAGEMENT_TABLES.events).destroy(id);
  }

  // ---- Colaboradores (con una columna por evento) ----
  private async eventNameMap(): Promise<{ idToName: Map<string, string>; names: string[] }> {
    const events = await this.listEngagementEvents();
    const idToName = new Map(events.map((e) => [e.id, e.name]));
    return { idToName, names: events.map((e) => e.name) };
  }

  async listEngagementParticipants(): Promise<EngagementParticipant[]> {
    const [records, { idToName }] = await Promise.all([
      this.selectAll(ENGAGEMENT_TABLES.participants),
      this.eventNameMap(),
    ]);
    return records
      .map((r) => this.participantFromRecord(r, idToName))
      .filter((p) => p.name);
  }

  private async participationFields(
    participation: Record<string, string> | undefined,
    idToName: Map<string, string>,
  ): Promise<Record<string, any>> {
    const fields: Record<string, any> = {};
    if (!participation) return fields;
    for (const [eid, status] of Object.entries(participation)) {
      const col = idToName.get(eid);
      // '' (o vacío) limpia la celda (sin marca) en lugar de escribir un estado.
      if (col) fields[col] = status || null;
    }
    return fields;
  }

  async createEngagementParticipant(
    d: Omit<EngagementParticipant, 'id'>,
  ): Promise<EngagementParticipant> {
    const { idToName } = await this.eventNameMap();
    const fields: Record<string, any> = {
      Nombre: d.name,
      Status: d.status,
    };
    if (d.area) fields['Área'] = d.area;
    if (d.hireDate) fields['Fecha Ingreso'] = d.hireDate;
    if (d.birthDate) fields['Fecha Nacimiento'] = d.birthDate;
    if (d.dni) fields['DNI'] = d.dni;
    if (d.position) fields['Cargo'] = d.position;
    Object.assign(fields, await this.participationFields(d.participation, idToName));
    const r = (await this.base(ENGAGEMENT_TABLES.participants).create(fields as any, {
      typecast: true,
    })) as unknown as Airtable.Record<FieldSet>;
    return this.participantFromRecord(r, idToName);
  }

  async updateEngagementParticipant(
    id: string,
    p: Partial<Omit<EngagementParticipant, 'id'>>,
  ): Promise<EngagementParticipant> {
    const { idToName } = await this.eventNameMap();
    const fields: Record<string, any> = {};
    if (p.name !== undefined) fields['Nombre'] = p.name;
    if (p.status !== undefined) fields['Status'] = p.status;
    if (p.area !== undefined) fields['Área'] = p.area || null;
    if (p.hireDate !== undefined) fields['Fecha Ingreso'] = p.hireDate || null;
    if (p.birthDate !== undefined) fields['Fecha Nacimiento'] = p.birthDate || null;
    if (p.dni !== undefined) fields['DNI'] = p.dni || null;
    if (p.position !== undefined) fields['Cargo'] = p.position || null;
    Object.assign(fields, await this.participationFields(p.participation as any, idToName));
    const r = (await this.base(ENGAGEMENT_TABLES.participants).update(id, fields, {
      typecast: true,
    })) as unknown as Airtable.Record<FieldSet>;
    return this.participantFromRecord(r, idToName);
  }

  async deleteEngagementParticipant(id: string): Promise<void> {
    await this.base(ENGAGEMENT_TABLES.participants).destroy(id);
  }

  // ---- Engagement: gastos por evento ----
  private engExpenseFromRecord(r: Airtable.Record<FieldSet>): EngagementExpense {
    const f = r.fields;
    const monthLabel = str(f, 'Mes');
    const month =
      PAYMENT_MONTHS.find((m) => m.label === monthLabel)?.key || monthLabel || '';
    return {
      id: r.id,
      eventId: str(f, 'ID Evento') || '',
      eventName: str(f, 'Evento'),
      month,
      name: str(f, 'Nombre de Gasto') || '',
      amount: num(f, 'Monto'),
    };
  }

  private engExpenseFieldsForWrite(d: Partial<EngagementExpense>): Record<string, any> {
    const f: Record<string, any> = {};
    if (d.name !== undefined) f['Nombre de Gasto'] = d.name;
    if (d.eventId !== undefined) f['ID Evento'] = d.eventId ?? null;
    if (d.eventName !== undefined) f['Evento'] = d.eventName ?? null;
    if (d.month !== undefined) {
      const label = PAYMENT_MONTHS.find((m) => m.key === d.month)?.label || d.month;
      f['Mes'] = label || null;
    }
    if (d.amount !== undefined) f['Monto'] = d.amount ?? null;
    return f;
  }

  async listEngagementExpenses(): Promise<EngagementExpense[]> {
    const records = await this.selectAll(ENGAGEMENT_TABLES.expenses);
    return records.map((r) => this.engExpenseFromRecord(r));
  }

  async createEngagementExpense(
    d: Omit<EngagementExpense, 'id'>,
  ): Promise<EngagementExpense> {
    const r = (await this.base(ENGAGEMENT_TABLES.expenses).create(
      this.engExpenseFieldsForWrite(d) as any,
      { typecast: true },
    )) as unknown as Airtable.Record<FieldSet>;
    return this.engExpenseFromRecord(r);
  }

  async updateEngagementExpense(
    id: string,
    p: Partial<Omit<EngagementExpense, 'id'>>,
  ): Promise<EngagementExpense> {
    const r = (await this.base(ENGAGEMENT_TABLES.expenses).update(
      id,
      this.engExpenseFieldsForWrite(p) as any,
      { typecast: true },
    )) as unknown as Airtable.Record<FieldSet>;
    return this.engExpenseFromRecord(r);
  }

  async deleteEngagementExpense(id: string): Promise<void> {
    await this.base(ENGAGEMENT_TABLES.expenses).destroy(id);
  }

  // ---- Engagement: eventos propios de gastos (catálogo) ----
  async listEngagementGastoEventos(): Promise<CatalogItem[]> {
    const records = await this.selectAll(ENGAGEMENT_TABLES.gastoEventos);
    return records
      .map((r) => ({ id: r.id, recordId: r.id, name: str(r.fields, 'Nombre') || '' }))
      .filter((e) => e.name);
  }
  async createEngagementGastoEvento(name: string): Promise<CatalogItem> {
    const r = (await this.base(ENGAGEMENT_TABLES.gastoEventos).create(
      { Nombre: name } as any,
      { typecast: true },
    )) as unknown as Airtable.Record<FieldSet>;
    return { id: r.id, recordId: r.id, name: str(r.fields, 'Nombre') || name };
  }
  async deleteEngagementGastoEvento(id: string): Promise<void> {
    await this.base(ENGAGEMENT_TABLES.gastoEventos).destroy(id);
  }

  private participantFromRecord(
    r: Airtable.Record<FieldSet>,
    idToName: Map<string, string>,
  ): EngagementParticipant {
    const participation: Record<string, any> = {};
    for (const [eid, col] of idToName) {
      const v = str(r.fields, col);
      if (v) participation[eid] = v;
    }
    return {
      id: r.id,
      name: str(r.fields, 'Nombre') || '',
      status: (str(r.fields, 'Status') as any) || 'Activo',
      area: str(r.fields, 'Área'),
      hireDate: str(r.fields, 'Fecha Ingreso'),
      birthDate: str(r.fields, 'Fecha Nacimiento'),
      dni: str(r.fields, 'DNI'),
      position: str(r.fields, 'Cargo'),
      participation,
    };
  }

  // Metadata API: crea / renombra columnas singleSelect de participación.
  private async ensureParticipationField(eventName: string): Promise<void> {
    try {
      const url = `https://api.airtable.com/v0/meta/bases/${env.airtable.baseId}/tables/${ENGAGEMENT_TABLES.participants}/fields`;
      await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.airtable.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: eventName,
          type: 'singleSelect',
          options: {
            choices: PARTICIPATION_CHOICES.map((name) => ({ name })),
          },
        }),
      });
    } catch (e) {
      console.error('[airtable] no se pudo crear la columna de evento', e);
    }
  }

  private async renameParticipationField(
    oldName: string,
    newName: string,
  ): Promise<void> {
    try {
      const metaUrl = `https://api.airtable.com/v0/meta/bases/${env.airtable.baseId}/tables`;
      const res = await fetch(metaUrl, {
        headers: { Authorization: `Bearer ${env.airtable.token}` },
      });
      const json = (await res.json()) as any;
      const table = json.tables?.find(
        (t: any) => t.id === ENGAGEMENT_TABLES.participants,
      );
      const field = table?.fields?.find((f: any) => f.name === oldName);
      if (!field) return;
      await fetch(
        `${metaUrl}/${ENGAGEMENT_TABLES.participants}/fields/${field.id}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${env.airtable.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: newName }),
        },
      );
    } catch (e) {
      console.error('[airtable] no se pudo renombrar la columna de evento', e);
    }
  }

  // ============================================================
  // MERCH (Airtable: Órdenes de compra / Usos)
  // ============================================================
  private orderFromRecord(r: Airtable.Record<FieldSet>): PurchaseOrder {
    const f = r.fields;
    return {
      id: r.id,
      orderId: str(f, 'ID Compra') || '',
      purchaseDate: str(f, 'Fecha de Compra'),
      productType: str(f, 'Tipo de producto') || 'Merch',
      article: str(f, 'Artículo') || '',
      unitPrice: num(f, 'Precio unit'),
      qtyOrdered: num(f, 'Cantidad Comprada'),
      totalPrice: num(f, 'Precio Total'),
      qtyArrived: num(f, 'Cantidad Llegada'),
      endDate: str(f, 'Fecha de Termino'),
      supplier: str(f, 'Proveedor'),
      contact: str(f, 'Contacto'),
      comments: str(f, 'Comentarios'),
    };
  }

  async listPurchaseOrders(): Promise<PurchaseOrder[]> {
    const records = await this.selectAll(MERCH_TABLES.orders);
    return records
      .map((r) => this.orderFromRecord(r))
      .filter((o) => o.orderId || o.article)
      .sort((a, b) => a.orderId.localeCompare(b.orderId));
  }

  private async nextOrderId(): Promise<string> {
    const records = await this.selectAll(MERCH_TABLES.orders);
    let maxN = 0;
    for (const r of records) {
      const m = String(r.fields['ID Compra'] || '').match(/^C-(\d{1,})$/);
      if (m) {
        const n = parseInt(m[1], 10);
        if (Number.isFinite(n) && n > maxN) maxN = n;
      }
    }
    return `C-${String(maxN + 1).padStart(3, '0')}`;
  }

  private orderFieldsForWrite(d: Partial<PurchaseOrder>): Record<string, any> {
    const f: Record<string, any> = {};
    if (d.orderId !== undefined) f['ID Compra'] = d.orderId;
    if (d.purchaseDate !== undefined) f['Fecha de Compra'] = d.purchaseDate || null;
    if (d.productType !== undefined) f['Tipo de producto'] = d.productType;
    if (d.article !== undefined) f['Artículo'] = d.article;
    if (d.unitPrice !== undefined) f['Precio unit'] = d.unitPrice ?? null;
    if (d.qtyOrdered !== undefined) f['Cantidad Comprada'] = d.qtyOrdered ?? null;
    if (d.totalPrice !== undefined) f['Precio Total'] = d.totalPrice ?? null;
    if (d.qtyArrived !== undefined) f['Cantidad Llegada'] = d.qtyArrived ?? null;
    if (d.endDate !== undefined) f['Fecha de Termino'] = d.endDate || null;
    if (d.supplier !== undefined) f['Proveedor'] = d.supplier ?? null;
    if (d.contact !== undefined) f['Contacto'] = d.contact ?? null;
    if (d.comments !== undefined) f['Comentarios'] = d.comments ?? null;
    return f;
  }

  async createPurchaseOrder(
    d: Omit<PurchaseOrder, 'id'>,
  ): Promise<PurchaseOrder> {
    const orderId = d.orderId || (await this.nextOrderId());
    const r = (await this.base(MERCH_TABLES.orders).create(
      this.orderFieldsForWrite({ ...d, orderId }) as any,
      { typecast: true },
    )) as unknown as Airtable.Record<FieldSet>;
    return this.orderFromRecord(r);
  }

  async updatePurchaseOrder(
    id: string,
    p: Partial<Omit<PurchaseOrder, 'id'>>,
  ): Promise<PurchaseOrder> {
    const r = (await this.base(MERCH_TABLES.orders).update(
      id,
      this.orderFieldsForWrite(p) as any,
      { typecast: true },
    )) as unknown as Airtable.Record<FieldSet>;
    return this.orderFromRecord(r);
  }

  async deletePurchaseOrder(id: string): Promise<void> {
    await this.base(MERCH_TABLES.orders).destroy(id);
  }

  private usageFromRecord(r: Airtable.Record<FieldSet>): MerchUsage {
    const f = r.fields;
    return {
      id: r.id,
      orderId: str(f, 'ID Compra Usado') || '',
      usageDate: str(f, 'Fecha'),
      quantity: num(f, 'Cantidad'),
      unitPrice: num(f, 'Precio Unit'),
      totalAmount: num(f, 'Monto total'),
      occasion: str(f, 'Ocasion'),
      comments: str(f, 'Evento Especifico'),
    };
  }

  async listMerchUsages(): Promise<MerchUsage[]> {
    const records = await this.selectAll(MERCH_TABLES.usages);
    return records.map((r) => this.usageFromRecord(r)).filter((u) => u.orderId);
  }

  private usageFieldsForWrite(d: Partial<MerchUsage>): Record<string, any> {
    const f: Record<string, any> = {};
    if (d.orderId !== undefined) f['ID Compra Usado'] = d.orderId;
    if (d.usageDate !== undefined) f['Fecha'] = d.usageDate || null;
    if (d.quantity !== undefined) f['Cantidad'] = d.quantity ?? null;
    if (d.unitPrice !== undefined) f['Precio Unit'] = d.unitPrice ?? null;
    if (d.totalAmount !== undefined) f['Monto total'] = d.totalAmount ?? null;
    if (d.occasion !== undefined) f['Ocasion'] = d.occasion ?? null;
    if (d.comments !== undefined) f['Evento Especifico'] = d.comments ?? null;
    return f;
  }

  async createMerchUsage(d: Omit<MerchUsage, 'id'>): Promise<MerchUsage> {
    const r = (await this.base(MERCH_TABLES.usages).create(
      this.usageFieldsForWrite(d) as any,
      { typecast: true },
    )) as unknown as Airtable.Record<FieldSet>;
    return this.usageFromRecord(r);
  }

  async updateMerchUsage(
    id: string,
    p: Partial<Omit<MerchUsage, 'id'>>,
  ): Promise<MerchUsage> {
    const r = (await this.base(MERCH_TABLES.usages).update(
      id,
      this.usageFieldsForWrite(p) as any,
      { typecast: true },
    )) as unknown as Airtable.Record<FieldSet>;
    return this.usageFromRecord(r);
  }

  async deleteMerchUsage(id: string): Promise<void> {
    await this.base(MERCH_TABLES.usages).destroy(id);
  }

  // ---- MERCH: gastos extra (no consumen stock) ----
  private expenseFromRecord(r: Airtable.Record<FieldSet>): MerchExtraExpense {
    const f = r.fields;
    return {
      id: r.id,
      name: str(f, 'Nombre de Gasto'),
      expenseType: str(f, 'Tipo de Gasto'),
      date: str(f, 'Fecha'),
      occasion: str(f, 'Ocasion'),
      event: str(f, 'Evento Especifico'),
      amount: num(f, 'Monto'),
    };
  }

  private expenseFieldsForWrite(d: Partial<MerchExtraExpense>): Record<string, any> {
    const f: Record<string, any> = {};
    if (d.name !== undefined) f['Nombre de Gasto'] = d.name ?? null;
    if (d.expenseType !== undefined) f['Tipo de Gasto'] = d.expenseType ?? null;
    if (d.date !== undefined) f['Fecha'] = d.date || null;
    if (d.occasion !== undefined) f['Ocasion'] = d.occasion ?? null;
    if (d.event !== undefined) f['Evento Especifico'] = d.event ?? null;
    if (d.amount !== undefined) f['Monto'] = d.amount ?? null;
    return f;
  }

  async listMerchExtraExpenses(): Promise<MerchExtraExpense[]> {
    const records = await this.selectAll(MERCH_TABLES.expenses);
    return records.map((r) => this.expenseFromRecord(r));
  }

  async createMerchExtraExpense(
    d: Omit<MerchExtraExpense, 'id'>,
  ): Promise<MerchExtraExpense> {
    const r = (await this.base(MERCH_TABLES.expenses).create(
      this.expenseFieldsForWrite(d) as any,
      { typecast: true },
    )) as unknown as Airtable.Record<FieldSet>;
    return this.expenseFromRecord(r);
  }

  async updateMerchExtraExpense(
    id: string,
    p: Partial<Omit<MerchExtraExpense, 'id'>>,
  ): Promise<MerchExtraExpense> {
    const r = (await this.base(MERCH_TABLES.expenses).update(
      id,
      this.expenseFieldsForWrite(p) as any,
      { typecast: true },
    )) as unknown as Airtable.Record<FieldSet>;
    return this.expenseFromRecord(r);
  }

  async deleteMerchExtraExpense(id: string): Promise<void> {
    await this.base(MERCH_TABLES.expenses).destroy(id);
  }

  // ---- Pagos fijos mensuales ----
  private paymentFromRecord(r: Airtable.Record<FieldSet>): FixedPayment {
    const f = r.fields;
    const status: Record<string, any> = {};
    for (const m of PAYMENT_MONTHS) {
      const v = str(f, m.label);
      if (v) status[m.key] = v;
    }
    let scheduledAt: Record<string, string> | undefined;
    const rawSched = str(f, 'Programado Fechas');
    if (rawSched) {
      try {
        scheduledAt = JSON.parse(rawSched);
      } catch {
        scheduledAt = undefined;
      }
    }
    let paidAt: Record<string, string> | undefined;
    const rawPaid = str(f, 'Pago Real Fechas');
    if (rawPaid) {
      try {
        paidAt = JSON.parse(rawPaid);
      } catch {
        paidAt = undefined;
      }
    }
    return {
      id: r.id,
      name: str(f, 'Nombre de Pago') || '',
      provider: str(f, 'Proveedor'),
      partida: str(f, 'Partida'),
      sender: str(f, 'Quien Manda'),
      paymentDate: str(f, 'Fecha de Pago'),
      status,
      scheduledAt,
      paidAt,
    };
  }

  private paymentFieldsForWrite(d: Partial<FixedPayment>): Record<string, any> {
    const f: Record<string, any> = {};
    if (d.name !== undefined) f['Nombre de Pago'] = d.name;
    if (d.provider !== undefined) f['Proveedor'] = d.provider ?? null;
    if (d.partida !== undefined) f['Partida'] = d.partida ?? null;
    if (d.sender !== undefined) f['Quien Manda'] = d.sender ?? null;
    if (d.paymentDate !== undefined) f['Fecha de Pago'] = d.paymentDate ?? null;
    if (d.status) {
      const byKey = new Map(PAYMENT_MONTHS.map((m) => [m.key, m.label]));
      for (const [key, val] of Object.entries(d.status)) {
        const label = byKey.get(key as any);
        if (label) f[label] = val ?? null;
      }
    }
    if (d.scheduledAt !== undefined) {
      f['Programado Fechas'] = d.scheduledAt
        ? JSON.stringify(d.scheduledAt)
        : null;
    }
    if (d.paidAt !== undefined) {
      f['Pago Real Fechas'] = d.paidAt ? JSON.stringify(d.paidAt) : null;
    }
    return f;
  }

  async listFixedPayments(): Promise<FixedPayment[]> {
    const records = await this.selectAll(PAGOS_TABLE);
    return records.map((r) => this.paymentFromRecord(r)).filter((p) => p.name);
  }

  async createFixedPayment(d: Omit<FixedPayment, 'id'>): Promise<FixedPayment> {
    const r = (await this.base(PAGOS_TABLE).create(
      this.paymentFieldsForWrite(d) as any,
      { typecast: true },
    )) as unknown as Airtable.Record<FieldSet>;
    return this.paymentFromRecord(r);
  }

  async updateFixedPayment(
    id: string,
    p: Partial<Omit<FixedPayment, 'id'>>,
  ): Promise<FixedPayment> {
    const r = (await this.base(PAGOS_TABLE).update(
      id,
      this.paymentFieldsForWrite(p) as any,
      { typecast: true },
    )) as unknown as Airtable.Record<FieldSet>;
    return this.paymentFromRecord(r);
  }

  async deleteFixedPayment(id: string): Promise<void> {
    await this.base(PAGOS_TABLE).destroy(id);
  }

  // ---- RHE (recibos por honorarios) ----
  private rheFromRecord(r: Airtable.Record<FieldSet>): RheEntry {
    const f = r.fields;
    const status: Record<string, any> = {};
    for (const m of PAYMENT_MONTHS) {
      const v = str(f, m.label);
      if (v) status[m.key] = v;
    }
    let scheduledAt: Record<string, string> | undefined;
    const rawSched = str(f, 'Programado Fechas');
    if (rawSched) {
      try {
        scheduledAt = JSON.parse(rawSched);
      } catch {
        scheduledAt = undefined;
      }
    }
    let paidAt: Record<string, string> | undefined;
    const rawPaid = str(f, 'Pago Real Fechas');
    if (rawPaid) {
      try {
        paidAt = JSON.parse(rawPaid);
      } catch {
        paidAt = undefined;
      }
    }
    return {
      id: r.id,
      person: str(f, 'Persona') || '',
      personStatus: str(f, 'Status'),
      contact: str(f, 'Contacto'),
      area: str(f, 'Areas'),
      partida: str(f, 'Partida'),
      entity: str(f, 'Entidad'),
      paymentDate: str(f, 'Fecha de Pago'),
      status,
      scheduledAt,
      paidAt,
    };
  }

  private rheFieldsForWrite(d: Partial<RheEntry>): Record<string, any> {
    const f: Record<string, any> = {};
    if (d.person !== undefined) f['Persona'] = d.person;
    if (d.personStatus !== undefined) f['Status'] = d.personStatus ?? null;
    if (d.contact !== undefined) f['Contacto'] = d.contact ?? null;
    if (d.area !== undefined) f['Areas'] = d.area ?? null;
    if (d.partida !== undefined) f['Partida'] = d.partida ?? null;
    if (d.entity !== undefined) f['Entidad'] = d.entity ?? null;
    if (d.paymentDate !== undefined) f['Fecha de Pago'] = d.paymentDate ?? null;
    if (d.status) {
      const byKey = new Map(PAYMENT_MONTHS.map((m) => [m.key, m.label]));
      for (const [key, val] of Object.entries(d.status)) {
        const label = byKey.get(key as any);
        if (label) f[label] = val ?? null;
      }
    }
    if (d.scheduledAt !== undefined) {
      f['Programado Fechas'] = d.scheduledAt ? JSON.stringify(d.scheduledAt) : null;
    }
    if (d.paidAt !== undefined) {
      f['Pago Real Fechas'] = d.paidAt ? JSON.stringify(d.paidAt) : null;
    }
    return f;
  }

  async listRheEntries(): Promise<RheEntry[]> {
    const records = await this.selectAll(RHE_TABLE);
    return records.map((r) => this.rheFromRecord(r)).filter((e) => e.person);
  }

  async createRheEntry(d: Omit<RheEntry, 'id'>): Promise<RheEntry> {
    const r = (await this.base(RHE_TABLE).create(this.rheFieldsForWrite(d) as any, {
      typecast: true,
    })) as unknown as Airtable.Record<FieldSet>;
    return this.rheFromRecord(r);
  }

  async updateRheEntry(
    id: string,
    p: Partial<Omit<RheEntry, 'id'>>,
  ): Promise<RheEntry> {
    const r = (await this.base(RHE_TABLE).update(id, this.rheFieldsForWrite(p) as any, {
      typecast: true,
    })) as unknown as Airtable.Record<FieldSet>;
    return this.rheFromRecord(r);
  }

  async deleteRheEntry(id: string): Promise<void> {
    await this.base(RHE_TABLE).destroy(id);
  }

  // ---- Sitios: asistencia (Llegó / No llegó) por reserva ----
  private attendanceFromRecord(r: Airtable.Record<FieldSet>): SitioAttendance {
    const f = r.fields;
    return {
      id: r.id,
      reservationId: str(f, 'Reserva ID') || '',
      date: str(f, 'Fecha'),
      person: str(f, 'Persona'),
      desk: str(f, 'Escritorio'),
      floor: typeof f['Piso'] === 'number' ? (f['Piso'] as number) : undefined,
      status: (str(f, 'Estado') as SitioAttendance['status']) || 'Llegó',
    };
  }

  async listSitioAttendance(): Promise<SitioAttendance[]> {
    const records = await this.selectAll(SITIOS_ASISTENCIA_TABLE);
    return records
      .map((r) => this.attendanceFromRecord(r))
      .filter((a) => a.reservationId);
  }

  async setSitioAttendance(
    data: Omit<SitioAttendance, 'id' | 'status'> & {
      status: SitioAttendance['status'] | null;
    },
  ): Promise<SitioAttendance | null> {
    // Buscar registro existente por Reserva ID.
    const existing = (await this.base(SITIOS_ASISTENCIA_TABLE)
      .select({
        filterByFormula: `{Reserva ID} = '${data.reservationId.replace(/'/g, "\\'")}'`,
        maxRecords: 1,
      })
      .firstPage()) as unknown as Airtable.Record<FieldSet>[];
    const current = existing[0];

    // status null/'' => borrar la marca.
    if (!data.status) {
      if (current) await this.base(SITIOS_ASISTENCIA_TABLE).destroy(current.id);
      return null;
    }

    const fields: Record<string, any> = {
      'Reserva ID': data.reservationId,
      Fecha: data.date ?? null,
      Persona: data.person ?? null,
      Escritorio: data.desk ?? null,
      Piso: typeof data.floor === 'number' ? data.floor : null,
      Estado: data.status,
    };

    const r = current
      ? ((await this.base(SITIOS_ASISTENCIA_TABLE).update(current.id, fields as any, {
          typecast: true,
        })) as unknown as Airtable.Record<FieldSet>)
      : ((await this.base(SITIOS_ASISTENCIA_TABLE).create(fields as any, {
          typecast: true,
        })) as unknown as Airtable.Record<FieldSet>);
    return this.attendanceFromRecord(r);
  }

  // Tipo de producto: catálogo fuera de Airtable — delega a local.
  listMerchProductTypes() { return this.local.listMerchProductTypes(); }
  createMerchProductType(name: string) { return this.local.createMerchProductType(name); }
  updateMerchProductType(id: string, name: string) { return this.local.updateMerchProductType(id, name); }
  deleteMerchProductType(id: string) { return this.local.deleteMerchProductType(id); }

  // ============================================================
  // Bienestar & Salud (Airtable: Examenes Medicos)
  // ============================================================
  private examFromRecord(r: Airtable.Record<FieldSet>): MedicalExam {
    const f = r.fields;
    return {
      id: r.id,
      collaboratorId: str(f, 'ID Colaborador') || '',
      collaboratorName: str(f, 'Colaborador') || '',
      examDate: str(f, 'Fecha de Examen'),
      sede: str(f, 'Sede'),
      status: str(f, 'Status'),
      resultado: str(f, 'Resultado'),
    };
  }

  private examFieldsForWrite(d: Partial<MedicalExam>): Record<string, any> {
    const f: Record<string, any> = {};
    if (d.collaboratorId !== undefined) f['ID Colaborador'] = d.collaboratorId;
    if (d.collaboratorName !== undefined) f['Colaborador'] = d.collaboratorName;
    if (d.examDate !== undefined) f['Fecha de Examen'] = d.examDate || null;
    if (d.sede !== undefined) f['Sede'] = d.sede || null;
    if (d.status !== undefined) f['Status'] = d.status || null;
    if (d.resultado !== undefined) f['Resultado'] = d.resultado || null;
    return f;
  }

  async listMedicalExams(): Promise<MedicalExam[]> {
    const records = await this.selectAll(BIENESTAR_EXAMS_TABLE);
    return records.map((r) => this.examFromRecord(r)).filter((e) => e.collaboratorName);
  }

  async createMedicalExam(d: Omit<MedicalExam, 'id'>): Promise<MedicalExam> {
    const r = (await this.base(BIENESTAR_EXAMS_TABLE).create(
      this.examFieldsForWrite(d) as any,
      { typecast: true },
    )) as unknown as Airtable.Record<FieldSet>;
    return this.examFromRecord(r);
  }

  async updateMedicalExam(
    id: string,
    p: Partial<Omit<MedicalExam, 'id'>>,
  ): Promise<MedicalExam> {
    const r = (await this.base(BIENESTAR_EXAMS_TABLE).update(
      id,
      this.examFieldsForWrite(p) as any,
      { typecast: true },
    )) as unknown as Airtable.Record<FieldSet>;
    return this.examFromRecord(r);
  }

  async deleteMedicalExam(id: string): Promise<void> {
    await this.base(BIENESTAR_EXAMS_TABLE).destroy(id);
  }

  listActivity(limit?: number) { return this.local.listActivity(limit); }
  logActivity(entry: Omit<ActivityLog, 'id' | 'createdAt'>) { return this.local.logActivity(entry); }

  listNotifications() { return this.local.listNotifications(); }
  markNotificationRead(id: string) { return this.local.markNotificationRead(id); }
  markAllNotificationsRead() { return this.local.markAllNotificationsRead(); }
  pushNotification(n: Omit<Notification, 'id' | 'createdAt' | 'read'>) {
    return this.local.pushNotification(n);
  }
}
