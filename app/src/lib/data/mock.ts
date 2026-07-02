import bcrypt from 'bcryptjs';
import type {
  ActivityLog,
  Candidate,
  CatalogItem,
  CatalogType,
  EngagementEvent,
  EngagementExpense,
  EngagementParticipant,
  Ingreso,
  FixedPayment,
  RheEntry,
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
import { getStore } from './store';
import {
  createArea as engCreateArea,
  createEvent as engCreateEvent,
  createParticipant as engCreateParticipant,
  deleteArea as engDeleteArea,
  deleteEvent as engDeleteEvent,
  deleteParticipant as engDeleteParticipant,
  listAreas as engListAreas,
  listEvents as engListEvents,
  listParticipants as engListParticipants,
  updateArea as engUpdateArea,
  updateEvent as engUpdateEvent,
  updateParticipant as engUpdateParticipant,
} from './engagement-store';
import {
  createEngExpense,
  deleteEngExpense,
  listEngExpenses,
  updateEngExpense,
  createGastoEvento,
  deleteGastoEvento,
  listGastoEventos,
} from './engagement-expenses-store';
import {
  createExpense as merchCreateExpense,
  createOrder as merchCreateOrder,
  createUsage as merchCreateUsage,
  deleteExpense as merchDeleteExpense,
  deleteOrder as merchDeleteOrder,
  deleteUsage as merchDeleteUsage,
  listExpenses as merchListExpenses,
  listOrders as merchListOrders,
  listUsages as merchListUsages,
  updateExpense as merchUpdateExpense,
  updateOrder as merchUpdateOrder,
  updateUsage as merchUpdateUsage,
} from './merch-store';
import {
  createExam as bienCreateExam,
  deleteExam as bienDeleteExam,
  listExams as bienListExams,
  updateExam as bienUpdateExam,
} from './bienestar-store';
import {
  createPayment as payCreate,
  deletePayment as payDelete,
  listPayments as payList,
  updatePayment as payUpdate,
  createRhe as rheCreate,
  deleteRhe as rheDelete,
  listRhe as rheList,
  updateRhe as rheUpdate,
} from './payments-store';
import {
  createProductType as ptCreate,
  deleteProductType as ptDelete,
  listProductTypes as ptList,
  updateProductType as ptUpdate,
} from './product-types-store';
import {
  listAttendance as sitiosListAttendance,
  setAttendance as sitiosSetAttendance,
} from './sitios-attendance-store';
import {
  isKvAvailable,
  kvCreateUser,
  kvDeleteUser,
  kvGetUserByEmailFull,
  kvGetUserById,
  kvListUsers,
  kvRecordLogin,
  kvUpdateUser,
} from './user-kv-store';
import type {
  CandidateFilter,
  Repository,
  VacancyFilter,
} from './repository';

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function publicUser(u: User): User {
  const { passwordHash: _p, ...rest } = u;
  return rest as User;
}

export class MockRepository implements Repository {
  source(): 'mock' | 'airtable' {
    return 'mock';
  }

  async health() {
    return { ok: true, detail: 'mock-store', source: 'mock' as const };
  }

  // ---- Users ----
  // Si Vercel KV esta disponible, usa el store persistente. Si no, cae al
  // store en memoria (util para dev local sin KV configurado).
  async listUsers() {
    if (isKvAvailable()) return kvListUsers();
    return getStore().users.map(publicUser);
  }

  async getUserByEmail(email: string) {
    if (isKvAvailable()) return kvGetUserByEmailFull(email);
    return (
      getStore().users.find(
        (u) => u.email.toLowerCase() === email.toLowerCase(),
      ) || null
    );
  }

  async getUserById(id: string) {
    if (isKvAvailable()) return kvGetUserById(id);
    const u = getStore().users.find((x) => x.id === id);
    return u ? publicUser(u) : null;
  }

  async createUser(
    data: Omit<User, 'id' | 'createdAt'> & { password: string },
  ) {
    if (isKvAvailable()) return kvCreateUser(data);
    const store = getStore();
    if (store.users.some((u) => u.email.toLowerCase() === data.email.toLowerCase())) {
      throw new Error('Ya existe un usuario con ese correo.');
    }
    const u: User = {
      id: uid('usr'),
      email: data.email,
      name: data.name,
      role: data.role,
      avatarUrl: data.avatarUrl,
      active: data.active ?? true,
      createdAt: new Date().toISOString(),
      passwordHash: bcrypt.hashSync(data.password, 10),
    };
    store.users.push(u);
    return publicUser(u);
  }

  async updateUser(
    id: string,
    patch: Partial<User> & { password?: string },
  ) {
    if (isKvAvailable()) return kvUpdateUser(id, patch);
    const store = getStore();
    const u = store.users.find((x) => x.id === id);
    if (!u) throw new Error('Usuario no encontrado');
    if (patch.email) u.email = patch.email;
    if (patch.name) u.name = patch.name;
    if (patch.role) u.role = patch.role;
    if (typeof patch.active === 'boolean') u.active = patch.active;
    if (patch.avatarUrl !== undefined) u.avatarUrl = patch.avatarUrl;
    if (patch.password) u.passwordHash = bcrypt.hashSync(patch.password, 10);
    return publicUser(u);
  }

  async deleteUser(id: string) {
    if (isKvAvailable()) {
      await kvDeleteUser(id);
      return;
    }
    const store = getStore();
    store.users = store.users.filter((u) => u.id !== id);
  }

  async recordLogin(id: string) {
    if (isKvAvailable()) {
      await kvRecordLogin(id);
      return;
    }
    const u = getStore().users.find((x) => x.id === id);
    if (u) u.lastLoginAt = new Date().toISOString();
  }

  // ---- Candidates ----
  async listCandidates(filter?: CandidateFilter) {
    let list = [...getStore().candidates];
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
    if (filter?.vacancyId)
      list = list.filter((c) => c.vacancyId === filter.vacancyId);
    if (filter?.recruiter)
      list = list.filter((c) => c.recruiter === filter.recruiter);
    if (filter?.finalStatus)
      list = list.filter((c) => c.finalStatus === filter.finalStatus);
    return list.sort((a, b) => (a.appliedAt < b.appliedAt ? 1 : -1));
  }

  async getCandidate(id: string) {
    return getStore().candidates.find((c) => c.id === id) || null;
  }

  async createCandidate(
    data: Omit<Candidate, 'id' | 'recordId' | 'appliedAt'> & { appliedAt?: string },
  ) {
    // ID autoincremental con formato CNNNN basado en los existentes
    const store = getStore();
    let maxN = 0;
    for (const c of store.candidates) {
      const m = c.id.match(/^C(\d{1,})$/);
      if (m) {
        const n = parseInt(m[1], 10);
        if (Number.isFinite(n) && n > maxN) maxN = n;
      }
    }
    const id = `C${String(maxN + 1).padStart(4, '0')}`;
    const c: Candidate = {
      ...data,
      id,
      recordId: `rec_${uid('cand')}`,
      appliedAt: data.appliedAt || new Date().toISOString(),
    };
    store.candidates.unshift(c);
    return c;
  }

  async updateCandidate(id: string, patch: Partial<Candidate>) {
    const store = getStore();
    const c = store.candidates.find((x) => x.id === id);
    if (!c) throw new Error('Candidato no encontrado');
    Object.assign(c, patch);
    return c;
  }

  async deleteCandidate(id: string) {
    const store = getStore();
    store.candidates = store.candidates.filter((c) => c.id !== id);
  }

  async moveCandidateStage(id: string, stage: Stage) {
    return this.updateCandidate(id, { stage });
  }

  // ---- Vacancies ----
  async listVacancies(filter?: VacancyFilter) {
    let list = [...getStore().vacancies];
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
    return getStore().vacancies.find((v) => v.id === id) || null;
  }

  async createVacancy(
    data: Omit<Vacancy, 'id' | 'recordId' | 'openedAt'> & { openedAt?: string },
  ) {
    // ID autoincremental con formato VCNNNN basado en los existentes
    const store = getStore();
    let maxN = 0;
    for (const v of store.vacancies) {
      const m = v.id.match(/^VC(\d{1,})$/);
      if (m) {
        const n = parseInt(m[1], 10);
        if (Number.isFinite(n) && n > maxN) maxN = n;
      }
    }
    const id = `VC${String(maxN + 1).padStart(4, '0')}`;
    const v: Vacancy = {
      ...data,
      id,
      recordId: `rec_${uid('vac')}`,
      openedAt: data.openedAt || new Date().toISOString(),
    };
    store.vacancies.unshift(v);
    return v;
  }

  async updateVacancy(id: string, patch: Partial<Vacancy>) {
    const v = getStore().vacancies.find((x) => x.id === id);
    if (!v) throw new Error('Vacante no encontrada');
    Object.assign(v, patch);
    return v;
  }

  async deleteVacancy(id: string) {
    const store = getStore();
    store.vacancies = store.vacancies.filter((v) => v.id !== id);
  }

  // ---- Movements ----
  async listStageMovements(candidateId?: string): Promise<StageMovement[]> {
    const list = getStore().movements;
    return candidateId ? list.filter((m) => m.candidateId === candidateId) : list;
  }

  async createStageMovement(
    data: Omit<StageMovement, 'id' | 'recordId'> & { id?: string },
  ): Promise<StageMovement> {
    const store = getStore();
    // ID autoincremental MV0001, MV0002, ... basado en el max existente
    let maxN = 0;
    for (const m of store.movements) {
      const mt = m.id.match(/^MV(\d{1,})$/);
      if (mt) {
        const n = parseInt(mt[1], 10);
        if (Number.isFinite(n) && n > maxN) maxN = n;
      }
    }
    const id = data.id || `MV${String(maxN + 1).padStart(4, '0')}`;
    const m: StageMovement = {
      id,
      recordId: `rec_${uid('mov')}`,
      candidateId: data.candidateId,
      vacancyId: data.vacancyId,
      stage: data.stage,
      startedAt: data.startedAt,
      endedAt: data.endedAt,
      result: data.result,
      comments: data.comments,
    };
    store.movements.unshift(m);
    return m;
  }

  async updateStageMovement(
    id: string,
    patch: Partial<StageMovement>,
  ): Promise<StageMovement> {
    const m = getStore().movements.find((x) => x.id === id);
    if (!m) throw new Error('Movimiento no encontrado');
    Object.assign(m, patch);
    return m;
  }

  async deleteStageMovement(id: string): Promise<void> {
    const store = getStore();
    store.movements = store.movements.filter((m) => m.id !== id);
  }

  // ---- Sources ----
  async listSources(): Promise<Source[]> {
    return [...getStore().sources];
  }

  async createSource(data: Omit<Source, 'id'>): Promise<Source> {
    // ID autoincremental F0001, F0002, ...
    const store = getStore();
    let maxN = 0;
    for (const s of store.sources) {
      const m = (s.sourceId || '').match(/^F(\d{1,})$/);
      if (m) {
        const n = parseInt(m[1], 10);
        if (Number.isFinite(n) && n > maxN) maxN = n;
      }
    }
    const item: Source = {
      ...data,
      id: `rec_${uid('src')}`,
      sourceId: data.sourceId || `F${String(maxN + 1).padStart(4, '0')}`,
    };
    store.sources.unshift(item);
    return item;
  }

  async updateSource(recordId: string, patch: Partial<Source>): Promise<Source> {
    const item = getStore().sources.find((x) => x.id === recordId);
    if (!item) throw new Error('Fuente no encontrada');
    Object.assign(item, patch);
    return item;
  }

  async deleteSource(recordId: string): Promise<void> {
    const store = getStore();
    store.sources = store.sources.filter((x) => x.id !== recordId);
  }

  // ---- Ingresos ----
  async listIngresos(): Promise<Ingreso[]> {
    return [...getStore().ingresos];
  }

  async createIngreso(data: Omit<Ingreso, 'id'>): Promise<Ingreso> {
    const item: Ingreso = {
      ...data,
      id: `rec_${uid('ing')}`,
    };
    getStore().ingresos.unshift(item);
    return item;
  }

  async updateIngreso(
    recordId: string,
    patch: Partial<Ingreso>,
  ): Promise<Ingreso> {
    const item = getStore().ingresos.find((x) => x.id === recordId);
    if (!item) throw new Error('Ingreso no encontrado');
    Object.assign(item, patch);
    return item;
  }

  async deleteIngreso(recordId: string): Promise<void> {
    const store = getStore();
    store.ingresos = store.ingresos.filter((x) => x.id !== recordId);
  }

  // ---- Salary ranges ----
  async listSalaryRanges(): Promise<SalaryRange[]> {
    return [...getStore().salaryRanges];
  }

  async createSalaryRange(
    data: Omit<SalaryRange, 'id'>,
  ): Promise<SalaryRange> {
    const item: SalaryRange = {
      ...data,
      id: `rec_${uid('sr')}`,
    };
    getStore().salaryRanges.unshift(item);
    return item;
  }

  async updateSalaryRange(
    recordId: string,
    patch: Partial<SalaryRange>,
  ): Promise<SalaryRange> {
    const item = getStore().salaryRanges.find((x) => x.id === recordId);
    if (!item) throw new Error('Rango salarial no encontrado');
    Object.assign(item, patch);
    return item;
  }

  async deleteSalaryRange(recordId: string): Promise<void> {
    const store = getStore();
    store.salaryRanges = store.salaryRanges.filter((x) => x.id !== recordId);
  }

  // ---- Review times ----
  async listReviewTimes(): Promise<ReviewTime[]> {
    return [...getStore().reviewTimes];
  }

  async createReviewTime(data: Omit<ReviewTime, 'id'>): Promise<ReviewTime> {
    const store = getStore();
    let maxN = 0;
    for (const rt of store.reviewTimes) {
      const m = (rt.reviewId || '').match(/^RV(\d{1,})$/);
      if (m) {
        const n = parseInt(m[1], 10);
        if (Number.isFinite(n) && n > maxN) maxN = n;
      }
    }
    const item: ReviewTime = {
      ...data,
      id: `rec_${uid('rev')}`,
      reviewId: data.reviewId || `RV${String(maxN + 1).padStart(4, '0')}`,
    };
    store.reviewTimes.unshift(item);
    return item;
  }

  async updateReviewTime(
    recordId: string,
    patch: Partial<ReviewTime>,
  ): Promise<ReviewTime> {
    const item = getStore().reviewTimes.find((x) => x.id === recordId);
    if (!item) throw new Error('Registro de revisión no encontrado');
    Object.assign(item, patch);
    return item;
  }

  async deleteReviewTime(recordId: string): Promise<void> {
    const store = getStore();
    store.reviewTimes = store.reviewTimes.filter((x) => x.id !== recordId);
  }

  // ---- Engagement & Cultura ----
  async listEngagementEvents(): Promise<EngagementEvent[]> {
    return engListEvents();
  }
  async createEngagementEvent(
    data: Omit<EngagementEvent, 'id'>,
  ): Promise<EngagementEvent> {
    return engCreateEvent(data);
  }
  async updateEngagementEvent(
    id: string,
    patch: Partial<Omit<EngagementEvent, 'id'>>,
  ): Promise<EngagementEvent> {
    return engUpdateEvent(id, patch);
  }
  async deleteEngagementEvent(id: string): Promise<void> {
    return engDeleteEvent(id);
  }

  async listEngagementAreas(): Promise<CatalogItem[]> {
    return engListAreas();
  }
  async createEngagementArea(name: string): Promise<CatalogItem> {
    return engCreateArea(name);
  }
  async updateEngagementArea(id: string, name: string): Promise<CatalogItem> {
    return engUpdateArea(id, name);
  }
  async deleteEngagementArea(id: string): Promise<void> {
    return engDeleteArea(id);
  }

  async listEngagementParticipants(): Promise<EngagementParticipant[]> {
    return engListParticipants();
  }
  async createEngagementParticipant(
    data: Omit<EngagementParticipant, 'id'>,
  ): Promise<EngagementParticipant> {
    return engCreateParticipant(data);
  }
  async updateEngagementParticipant(
    id: string,
    patch: Partial<Omit<EngagementParticipant, 'id'>>,
  ): Promise<EngagementParticipant> {
    return engUpdateParticipant(id, patch);
  }
  async deleteEngagementParticipant(id: string): Promise<void> {
    return engDeleteParticipant(id);
  }

  // ---- Engagement (eventos propios de gastos) ----
  async listEngagementGastoEventos(): Promise<CatalogItem[]> {
    return listGastoEventos();
  }
  async createEngagementGastoEvento(name: string): Promise<CatalogItem> {
    return createGastoEvento(name);
  }
  async deleteEngagementGastoEvento(id: string): Promise<void> {
    return deleteGastoEvento(id);
  }

  // ---- Engagement (gastos por evento) ----
  async listEngagementExpenses(): Promise<EngagementExpense[]> {
    return listEngExpenses();
  }
  async createEngagementExpense(
    data: Omit<EngagementExpense, 'id'>,
  ): Promise<EngagementExpense> {
    return createEngExpense(data);
  }
  async updateEngagementExpense(
    id: string,
    patch: Partial<Omit<EngagementExpense, 'id'>>,
  ): Promise<EngagementExpense> {
    return updateEngExpense(id, patch);
  }
  async deleteEngagementExpense(id: string): Promise<void> {
    return deleteEngExpense(id);
  }

  // ---- MERCH (órdenes de compra) ----
  async listPurchaseOrders(): Promise<PurchaseOrder[]> {
    return merchListOrders();
  }
  async createPurchaseOrder(
    data: Omit<PurchaseOrder, 'id'>,
  ): Promise<PurchaseOrder> {
    return merchCreateOrder(data);
  }
  async updatePurchaseOrder(
    id: string,
    patch: Partial<Omit<PurchaseOrder, 'id'>>,
  ): Promise<PurchaseOrder> {
    return merchUpdateOrder(id, patch);
  }
  async deletePurchaseOrder(id: string): Promise<void> {
    return merchDeleteOrder(id);
  }

  async listMerchUsages(): Promise<MerchUsage[]> {
    return merchListUsages();
  }
  async createMerchUsage(data: Omit<MerchUsage, 'id'>): Promise<MerchUsage> {
    return merchCreateUsage(data);
  }
  async updateMerchUsage(
    id: string,
    patch: Partial<Omit<MerchUsage, 'id'>>,
  ): Promise<MerchUsage> {
    return merchUpdateUsage(id, patch);
  }
  async deleteMerchUsage(id: string): Promise<void> {
    return merchDeleteUsage(id);
  }

  // ---- MERCH (gastos extra) ----
  async listMerchExtraExpenses(): Promise<MerchExtraExpense[]> {
    return merchListExpenses();
  }
  async createMerchExtraExpense(
    data: Omit<MerchExtraExpense, 'id'>,
  ): Promise<MerchExtraExpense> {
    return merchCreateExpense(data);
  }
  async updateMerchExtraExpense(
    id: string,
    patch: Partial<Omit<MerchExtraExpense, 'id'>>,
  ): Promise<MerchExtraExpense> {
    return merchUpdateExpense(id, patch);
  }
  async deleteMerchExtraExpense(id: string): Promise<void> {
    return merchDeleteExpense(id);
  }

  // ---- Tipo de producto (catálogo) ----
  async listMerchProductTypes(): Promise<CatalogItem[]> {
    return ptList();
  }
  async createMerchProductType(name: string): Promise<CatalogItem> {
    return ptCreate(name);
  }
  async updateMerchProductType(id: string, name: string): Promise<CatalogItem> {
    return ptUpdate(id, name);
  }
  async deleteMerchProductType(id: string): Promise<void> {
    return ptDelete(id);
  }

  // ---- Pagos fijos ----
  async listFixedPayments(): Promise<FixedPayment[]> {
    return payList();
  }
  async createFixedPayment(data: Omit<FixedPayment, 'id'>): Promise<FixedPayment> {
    return payCreate(data);
  }
  async updateFixedPayment(
    id: string,
    patch: Partial<Omit<FixedPayment, 'id'>>,
  ): Promise<FixedPayment> {
    return payUpdate(id, patch);
  }
  async deleteFixedPayment(id: string): Promise<void> {
    return payDelete(id);
  }

  // ---- RHE (recibos por honorarios) ----
  async listRheEntries(): Promise<RheEntry[]> {
    return rheList();
  }
  async createRheEntry(data: Omit<RheEntry, 'id'>): Promise<RheEntry> {
    return rheCreate(data);
  }
  async updateRheEntry(
    id: string,
    patch: Partial<Omit<RheEntry, 'id'>>,
  ): Promise<RheEntry> {
    return rheUpdate(id, patch);
  }
  async deleteRheEntry(id: string): Promise<void> {
    return rheDelete(id);
  }

  // ---- Sitios: asistencia ----
  async listSitioAttendance(): Promise<SitioAttendance[]> {
    return sitiosListAttendance();
  }
  async setSitioAttendance(
    data: Omit<SitioAttendance, 'id' | 'status'> & {
      status: SitioAttendance['status'] | null;
    },
  ): Promise<SitioAttendance | null> {
    return sitiosSetAttendance(data);
  }

  // ---- Bienestar & Salud (exámenes médicos) ----
  async listMedicalExams(): Promise<MedicalExam[]> {
    return bienListExams();
  }
  async createMedicalExam(data: Omit<MedicalExam, 'id'>): Promise<MedicalExam> {
    return bienCreateExam(data);
  }
  async updateMedicalExam(
    id: string,
    patch: Partial<Omit<MedicalExam, 'id'>>,
  ): Promise<MedicalExam> {
    return bienUpdateExam(id, patch);
  }
  async deleteMedicalExam(id: string): Promise<void> {
    return bienDeleteExam(id);
  }

  // ---- Catalogos maestros ----
  private catalogArray(type: CatalogType): CatalogItem[] {
    const store = getStore();
    if (type === 'seniorities') return store.seniorities;
    if (type === 'hiring-managers') return store.hiringManagers;
    return store.recruiters;
  }

  private catalogPrefix(type: CatalogType): string {
    if (type === 'seniorities') return 'S';
    if (type === 'hiring-managers') return 'HM';
    return 'R';
  }

  async listCatalog(type: CatalogType): Promise<CatalogItem[]> {
    return [...this.catalogArray(type)];
  }

  async createCatalogItem(type: CatalogType, name: string): Promise<CatalogItem> {
    const arr = this.catalogArray(type);
    const prefix = this.catalogPrefix(type);
    const re = new RegExp(`^${prefix}(\\d{1,})$`);
    let maxN = 0;
    for (const c of arr) {
      const m = c.id.match(re);
      if (m) {
        const n = parseInt(m[1], 10);
        if (Number.isFinite(n) && n > maxN) maxN = n;
      }
    }
    const item: CatalogItem = {
      id: `${prefix}${String(maxN + 1).padStart(4, '0')}`,
      recordId: `rec_${uid('cat')}`,
      name,
    };
    arr.push(item);
    return item;
  }

  async updateCatalogItem(
    type: CatalogType,
    id: string,
    name: string,
  ): Promise<CatalogItem> {
    const arr = this.catalogArray(type);
    const item = arr.find((x) => x.id === id);
    if (!item) throw new Error('Elemento no encontrado');
    item.name = name;
    return item;
  }

  async deleteCatalogItem(type: CatalogType, id: string): Promise<void> {
    const store = getStore();
    if (type === 'seniorities')
      store.seniorities = store.seniorities.filter((c) => c.id !== id);
    else if (type === 'hiring-managers')
      store.hiringManagers = store.hiringManagers.filter((c) => c.id !== id);
    else store.recruiters = store.recruiters.filter((c) => c.id !== id);
  }

  // ---- Activity ----
  async listActivity(limit = 50) {
    return getStore().activity.slice(0, limit);
  }

  async logActivity(entry: Omit<ActivityLog, 'id' | 'createdAt'>) {
    getStore().activity.unshift({
      ...entry,
      id: uid('act'),
      createdAt: new Date().toISOString(),
    });
  }

  // ---- Notifications ----
  async listNotifications() {
    return [...getStore().notifications].sort((a, b) =>
      a.createdAt < b.createdAt ? 1 : -1,
    );
  }

  async markNotificationRead(id: string) {
    const n = getStore().notifications.find((x) => x.id === id);
    if (n) n.read = true;
  }

  async markAllNotificationsRead() {
    getStore().notifications.forEach((n) => (n.read = true));
  }

  async pushNotification(
    n: Omit<Notification, 'id' | 'createdAt' | 'read'>,
  ) {
    const full: Notification = {
      ...n,
      id: uid('notif'),
      createdAt: new Date().toISOString(),
      read: false,
    };
    getStore().notifications.unshift(full);
    return full;
  }
}
