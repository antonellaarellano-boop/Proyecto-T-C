import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getRepo } from '@/lib/data/repository';
import { getSession } from '@/lib/auth/session';
import { PARTICIPATION_STATUSES, EMPLOYEE_STATUSES } from '@/lib/types';

export const runtime = 'nodejs';

const participationSchema = z.record(
  z.string(),
  z.union([
    z.enum(PARTICIPATION_STATUSES as [string, ...string[]]),
    z.literal(''), // '' = sin marca (blanco)
  ]),
);

const createSchema = z.object({
  name: z.string().trim().min(1, 'Nombre requerido'),
  status: z.enum(EMPLOYEE_STATUSES as [string, ...string[]]),
  area: z.string().trim().nullable().optional(),
  hireDate: z.string().trim().nullable().optional(),
  birthDate: z.string().trim().nullable().optional(),
  dni: z.string().trim().nullable().optional(),
  position: z.string().trim().nullable().optional(),
  participation: participationSchema.optional(),
});

export async function GET() {
  try {
    const repo = await getRepo();
    const data = await repo.listEngagementParticipants();
    return NextResponse.json({ data });
  } catch (err: any) {
    console.error('[api/engagement/participants GET]', err);
    return NextResponse.json(
      { error: err?.message || 'No se pudo listar' },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  if (session.role === 'viewer')
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Datos invalidos' },
      { status: 400 },
    );
  }

  try {
    const repo = await getRepo();
    const item = await repo.createEngagementParticipant({
      name: parsed.data.name,
      status: parsed.data.status as any,
      area: parsed.data.area || undefined,
      hireDate: parsed.data.hireDate || undefined,
      birthDate: parsed.data.birthDate || undefined,
      dni: parsed.data.dni || undefined,
      position: parsed.data.position || undefined,
      participation: (parsed.data.participation as any) || {},
    });
    await repo.logActivity({
      userId: session.sub,
      userName: session.name,
      action: 'creo colaborador (engagement)',
      entity: 'engagement-colaborador',
      entityId: item.id,
      detail: item.name,
    });
    return NextResponse.json({ data: item }, { status: 201 });
  } catch (err: any) {
    console.error('[api/engagement/participants POST]', err);
    return NextResponse.json(
      { error: err?.message || 'No se pudo crear' },
      { status: 500 },
    );
  }
}
