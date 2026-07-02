import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getRepo } from '@/lib/data/repository';
import { getSession } from '@/lib/auth/session';
import { PARTICIPATION_STATUSES, EMPLOYEE_STATUSES } from '@/lib/types';

export const runtime = 'nodejs';

const patchSchema = z.object({
  name: z.string().trim().min(1).optional(),
  status: z.enum(EMPLOYEE_STATUSES as [string, ...string[]]).optional(),
  area: z.string().trim().nullable().optional(),
  hireDate: z.string().trim().nullable().optional(),
  birthDate: z.string().trim().nullable().optional(),
  dni: z.string().trim().nullable().optional(),
  position: z.string().trim().nullable().optional(),
  participation: z
    .record(
      z.string(),
      z.union([
        z.enum(PARTICIPATION_STATUSES as [string, ...string[]]),
        z.literal(''), // '' = dejar en blanco (limpia la marca)
      ]),
    )
    .optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  if (session.role === 'viewer')
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Datos invalidos' },
      { status: 400 },
    );
  }

  try {
    const repo = await getRepo();
    const item = await repo.updateEngagementParticipant(params.id, parsed.data as any);
    await repo.logActivity({
      userId: session.sub,
      userName: session.name,
      action: 'actualizo colaborador (engagement)',
      entity: 'engagement-colaborador',
      entityId: item.id,
    });
    return NextResponse.json({ data: item });
  } catch (err: any) {
    console.error('[api/engagement/participants PATCH]', err);
    return NextResponse.json(
      { error: err?.message || 'No se pudo actualizar' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  if (session.role !== 'admin')
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });

  try {
    const repo = await getRepo();
    await repo.deleteEngagementParticipant(params.id);
    await repo.logActivity({
      userId: session.sub,
      userName: session.name,
      action: 'elimino colaborador (engagement)',
      entity: 'engagement-colaborador',
      entityId: params.id,
    });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[api/engagement/participants DELETE]', err);
    return NextResponse.json(
      { error: err?.message || 'No se pudo eliminar' },
      { status: 500 },
    );
  }
}
