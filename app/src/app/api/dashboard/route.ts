import { NextResponse } from 'next/server';
import { getRepo } from '@/lib/data/repository';
import { STAGES, type Stage } from '@/lib/types';

export const runtime = 'nodejs';
// Los KPIs se calculan sobre datos vivos de Airtable. Sin force-dynamic, Next.js
// prerenderiza la respuesta en build time y el Resumen queda con cifras congeladas.
export const dynamic = 'force-dynamic';

export async function GET() {
  const repo = await getRepo();
  const [candidates, vacancies, activity] = await Promise.all([
    repo.listCandidates(),
    repo.listVacancies(),
    repo.listActivity(8),
  ]);

  const now = Date.now();
  const weekAgo = now - 7 * 86_400_000;
  const monthAgo = now - 30 * 86_400_000;
  const twoMonthsAgo = now - 60 * 86_400_000;

  const newThisWeek = candidates.filter(
    (c) => new Date(c.appliedAt).getTime() >= weekAgo,
  ).length;

  const hired = candidates.filter((c) => c.finalStatus === 'Contratado');
  const hiresThisMonth = hired.filter(
    (c) => new Date(c.appliedAt).getTime() >= monthAgo,
  ).length;
  const hiresPrevMonth = hired.filter((c) => {
    const t = new Date(c.appliedAt).getTime();
    return t >= twoMonthsAgo && t < monthAgo;
  }).length;
  const candidatesPrevWeek = candidates.filter((c) => {
    const t = new Date(c.appliedAt).getTime();
    return t >= weekAgo - 7 * 86_400_000 && t < weekAgo;
  }).length;

  // Conversión / mes = contrataciones del mes / total de candidatos
  const conversionRate =
    candidates.length > 0 ? (hiresThisMonth / candidates.length) * 100 : 0;

  // Time to hire (días entre postulación y hoy para los hired)
  const avgTimeToHireDays =
    hired.length === 0
      ? 0
      : hired.reduce(
          (acc, c) =>
            acc + (Date.now() - new Date(c.appliedAt).getTime()) / 86_400_000,
          0,
        ) / hired.length;

  // Conteo por etapa
  const stageCounts: Record<Stage, number> = {
    Screening: 0,
    'Entrevista T&C': 0,
    'Entrevista líder': 0,
    'Prueba Tecnica': 0,
    Oferta: 0,
    Ingreso: 0,
  };
  candidates.forEach((c) => {
    if (stageCounts[c.stage] !== undefined) stageCounts[c.stage] += 1;
  });

  // Serie últimos 30 días: agrupar por YYYY-MM-DD calendario (sin TZ shift)
  const apCount: Record<string, number> = {};
  const hireCount: Record<string, number> = {};
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dailySeries: { label: string; aplicaciones: number; contrataciones: number }[] = [];
  const keysInOrder: string[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const key = `${y}-${m}-${day}`;
    apCount[key] = 0;
    hireCount[key] = 0;
    keysInOrder.push(key);
    dailySeries.push({
      label: d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }),
      aplicaciones: 0,
      contrataciones: 0,
    });
  }
  candidates.forEach((c) => {
    const k = (c.appliedAt || '').slice(0, 10);
    if (k && apCount[k] !== undefined) apCount[k] += 1;
  });
  hired.forEach((c) => {
    const k = (c.appliedAt || '').slice(0, 10);
    if (k && hireCount[k] !== undefined) hireCount[k] += 1;
  });
  keysInOrder.forEach((k, i) => {
    dailySeries[i].aplicaciones = apCount[k];
    dailySeries[i].contrataciones = hireCount[k];
  });

  // Fuentes
  const bySource: Record<string, number> = {};
  candidates.forEach((c) => {
    const s = String(c.source);
    bySource[s] = (bySource[s] || 0) + 1;
  });
  const sources = Object.entries(bySource)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Áreas
  const byArea: Record<string, number> = {};
  vacancies.forEach((v) => {
    const a = String(v.area || '—');
    byArea[a] = (byArea[a] || 0) + 1;
  });
  const areas = Object.entries(byArea)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Embudo (todas las etapas)
  const funnel = STAGES.map((s) => ({ stage: s, value: stageCounts[s] }));

  const kpi = {
    totalCandidates: candidates.length,
    newThisWeek,
    activeVacancies: vacancies.filter((v) => v.status === 'Abierta').length,
    hiresThisMonth,
    conversionRate: Math.round(conversionRate * 10) / 10,
    avgTimeToHireDays: Math.round(avgTimeToHireDays),
    trendCandidates:
      candidatesPrevWeek === 0
        ? 100
        : Math.round(((newThisWeek - candidatesPrevWeek) / candidatesPrevWeek) * 100),
    trendHires:
      hiresPrevMonth === 0
        ? 100
        : Math.round(((hiresThisMonth - hiresPrevMonth) / hiresPrevMonth) * 100),
  };

  return NextResponse.json({
    kpi,
    stageCounts,
    funnel,
    dailySeries,
    sources,
    areas,
    recentActivity: activity,
    source: repo.source(),
  });
}
