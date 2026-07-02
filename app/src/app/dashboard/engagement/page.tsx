import { getRepo } from '@/lib/data/repository';
import { EventosPage } from './eventos-page';
import {
  ParticipationPieByEvent,
  ParticipationByAreaChart,
  AunNoParticipaByAreaChart,
  NoParticipoByPersonChart,
  type EventParticipationDatum,
  type AreaParticipationRow,
  type AreaCountRow,
  type PersonCountRow,
} from '@/components/dashboard/engagement-charts';
import {
  PARTICIPATION_STATUSES,
  type ParticipationStatus,
  type EngagementParticipant,
} from '@/lib/types';

export const metadata = { title: 'Engagement · Eventos' };
export const dynamic = 'force-dynamic';

function areaLabel(p: EngagementParticipant): string {
  return p.area && p.area.trim() ? p.area : 'Sin área';
}

function emptyCounts(): Record<ParticipationStatus, number> {
  return {
    Participo: 0,
    'No Participo': 0,
    'No Aplica': 0,
    'Aun No Participa': 0,
  };
}

export default async function Page() {
  const repo = await getRepo();
  const [events, participants, areas] = await Promise.all([
    repo.listEngagementEvents(),
    repo.listEngagementParticipants(),
    repo.listEngagementAreas(),
  ]);

  // Todos los gráficos consideran SOLO colaboradores activos.
  const active = participants.filter((p) => p.status === 'Activo');

  // 1) Participación por evento (un pie por evento) + filas para el panel.
  const eventBreakdowns: EventParticipationDatum[] = events.map((ev) => {
    const counts = emptyCounts();
    const rows: { name: string; area: string; status: ParticipationStatus }[] = [];
    for (const p of active) {
      // Sin marca (blanco) → no cuenta ni aparece en el anillo.
      const v = p.participation[ev.id] as ParticipationStatus | undefined;
      if (!v) continue;
      counts[v] += 1;
      rows.push({ name: p.name, area: areaLabel(p), status: v });
    }
    return {
      eventId: ev.id,
      eventName: ev.name,
      breakdown: PARTICIPATION_STATUSES.map((s) => ({ status: s, value: counts[s] })),
      rows,
    };
  });

  // 2) Participación por área (acumulado sobre todos los eventos).
  const areaMap = new Map<string, Record<ParticipationStatus, number>>();
  for (const p of active) {
    const a = areaLabel(p);
    if (!areaMap.has(a)) areaMap.set(a, emptyCounts());
    const rec = areaMap.get(a)!;
    for (const ev of events) {
      const v = p.participation[ev.id] as ParticipationStatus | undefined;
      if (!v) continue; // blanco no cuenta
      rec[v] += 1;
    }
  }
  const participationByArea: AreaParticipationRow[] = Array.from(
    areaMap,
    ([area, rec]) => ({ area, ...rec }),
  ).sort((a, b) => {
    const ta = PARTICIPATION_STATUSES.reduce((acc, s) => acc + (a[s] as number), 0);
    const tb = PARTICIPATION_STATUSES.reduce((acc, s) => acc + (b[s] as number), 0);
    return tb - ta;
  });

  // 3) "Aún no participa" en Desayuno con Ruben, por área.
  const desayuno =
    events.find((e) => /desayuno\s+con\s+ruben/i.test(e.name)) || events[0];
  const anpMap = new Map<string, string[]>();
  if (desayuno) {
    for (const p of active) {
      const v = p.participation[desayuno.id] as ParticipationStatus | undefined;
      if (v === 'Aun No Participa') {
        const a = areaLabel(p);
        const arr = anpMap.get(a) || [];
        arr.push(p.name);
        anpMap.set(a, arr);
      }
    }
  }
  const anpByArea: AreaCountRow[] = Array.from(anpMap, ([area, names]) => ({
    area,
    value: names.length,
    names: names.sort((a, b) => a.localeCompare(b)),
  }));

  // 4) Cantidad de eventos con "No Participo" por persona (solo activos).
  const noParticipoByPerson: PersonCountRow[] = active
    .map((p) => {
      const missed = events
        .filter((ev) => p.participation[ev.id] === 'No Participo')
        .map((ev) => ev.name);
      return {
        name: p.name,
        area: areaLabel(p),
        value: missed.length,
        events: missed,
      };
    })
    .filter((row) => row.value > 0);

  return (
    <div className="space-y-6">
      {/* Gráficos arriba de la tabla */}
      <ParticipationPieByEvent events={eventBreakdowns} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ParticipationByAreaChart data={participationByArea} />
        <AunNoParticipaByAreaChart
          data={anpByArea}
          eventName={desayuno?.name || 'Desayuno con Ruben'}
        />
      </div>

      <NoParticipoByPersonChart data={noParticipoByPerson} />

      <EventosPage
        initialEvents={events}
        initialParticipants={participants}
        areaOptions={areas.map((a) => a.name)}
      />
    </div>
  );
}
