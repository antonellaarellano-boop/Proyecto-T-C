// Centraliza la lectura de variables de entorno con defaults seguros.
// Si DATA_SOURCE = "airtable" pero falta el token o base, se cae a "mock"
// y registra un warning en consola server.

export type DataSource = 'mock' | 'airtable';

function readDataSource(): DataSource {
  const raw = (process.env.DATA_SOURCE || 'mock').toLowerCase();
  if (raw === 'airtable') {
    if (!process.env.AIRTABLE_TOKEN || !process.env.AIRTABLE_BASE_ID) {
      if (typeof window === 'undefined') {
        console.warn(
          '[env] DATA_SOURCE=airtable pero faltan AIRTABLE_TOKEN/AIRTABLE_BASE_ID — usando mock.',
        );
      }
      return 'mock';
    }
    return 'airtable';
  }
  return 'mock';
}

export const env = {
  dataSource: readDataSource(),
  airtable: {
    token: process.env.AIRTABLE_TOKEN || '',
    baseId: process.env.AIRTABLE_BASE_ID || '',
    tables: {
      candidates: process.env.AIRTABLE_TABLE_CANDIDATES || 'Candidatos',
      vacancies: process.env.AIRTABLE_TABLE_VACANCIES || 'Vacantes',
      stages: process.env.AIRTABLE_TABLE_STAGES || 'Etapas',
      sources: process.env.AIRTABLE_TABLE_SOURCES || 'Fuentes',
      ingresos: process.env.AIRTABLE_TABLE_INGRESOS || 'Ingresos',
      salaryRange: process.env.AIRTABLE_TABLE_SALARY_RANGE || 'Rango salarial',
      reviewTime: process.env.AIRTABLE_TABLE_REVIEW_TIME || 'Tiempo de revision (head)',
    },
  },
  auth: {
    secret:
      process.env.AUTH_SECRET ||
      'dev-only-secret-please-change-me-in-production-environment-now',
    sessionTtl: Number(process.env.AUTH_SESSION_TTL || 28800),
  },
  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@baldecash.com',
    password: process.env.ADMIN_PASSWORD || 'Baldecash2026!',
  },
  app: {
    name: process.env.NEXT_PUBLIC_APP_NAME || 'Baldecash Talento & Cultura',
    url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  },
  // "Sitios" — datos en vivo del proyecto Supabase de Desk Buddy (reserva de
  // escritorios). Solo lectura. La URL y la anon key son públicas; el email y
  // password son de un usuario dedicado de solo lectura y viven solo en server.
  sitios: {
    url: process.env.SITIOS_SUPABASE_URL || '',
    anonKey: process.env.SITIOS_SUPABASE_ANON_KEY || '',
    email: process.env.SITIOS_SUPABASE_EMAIL || '',
    password: process.env.SITIOS_SUPABASE_PASSWORD || '',
    get enabled() {
      return Boolean(this.url && this.anonKey && this.email && this.password);
    },
  },
  // "Juegos de mesa" — datos en vivo del proyecto Supabase de la app de reserva
  // de juegos de mesa de la oficina. Solo lectura. El RLS de SELECT es público,
  // así que la anon/publishable key basta (no hace falta usuario de servicio).
  juegos: {
    url: process.env.JUEGOS_SUPABASE_URL || '',
    anonKey: process.env.JUEGOS_SUPABASE_ANON_KEY || '',
    get enabled() {
      return Boolean(this.url && this.anonKey);
    },
  },
};
