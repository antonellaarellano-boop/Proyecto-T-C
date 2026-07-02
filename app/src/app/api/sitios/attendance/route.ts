import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getRepo } from '@/lib/data/repository';
import { getSession } from '@/lib/auth/session';
import { SITIO_ATTENDANCE_STATUSES } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET → mapa { reservationId: 'Llegó' | 'No llegó' }
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  try {
    const repo = await getRepo();
    const rows = await repo.listSitioAttendance();
    const map: Record<string, string> = {};
    for (const a of rows) map[a.reservationId] = a.status;
    return NextResponse.json({ data: map });
  } catch (err: any) {
    console.error('[api/sitios/attendance GET]', err);
    return NextResponse.json(
      { error: err?.message || 'No se pudo leer asistencia' },
      { status: 500 },
    );
  }
}

const setSchema = z.object({
  reservationId: z.string().trim().min(1),
  date: z.string().trim().optional(),
  person: z.string().trim().optional(),
  desk: z.string().trim().optional(),
  floor: z.number().int().nullable().optional(),
  // '' o null borra la marca.
  status: z
    .union([z.enum(SITIO_ATTENDANCE_STATUSES as unknown as [string, ...string[]]), z.literal('')])
    .nullable(),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  if (session.role === 'viewer')
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = setSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Datos invalidos' },
      { status: 400 },
    );
  }

  const d = parsed.data;
  try {
    const repo = await getRepo();
    const item = await repo.setSitioAttendance({
      reservationId: d.reservationId,
      date: d.date,
      person: d.person,
      desk: d.desk,
      floor: d.floor ?? undefined,
      status: d.status ? (d.status as any) : null,
    });
    return NextResponse.json({ data: item });
  } catch (err: any) {
    console.error('[api/sitios/attendance POST]', err);
    return NextResponse.json(
      { error: err?.message || 'No se pudo guardar asistencia' },
      { status: 500 },
    );
  }
}
