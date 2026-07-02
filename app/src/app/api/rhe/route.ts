import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getRepo } from '@/lib/data/repository';
import { getSession } from '@/lib/auth/session';

export const runtime = 'nodejs';

const statusEnum = z.enum([
  'Pendiente',
  'Programado',
  'Parcial',
  'Automatico',
  'Listo',
  'No se realizo',
]);

const rheSchema = z.object({
  person: z.string().trim().min(1, 'Nombre requerido'),
  personStatus: z.string().trim().nullable().optional(),
  contact: z.string().trim().nullable().optional(),
  area: z.string().trim().nullable().optional(),
  partida: z.string().trim().nullable().optional(),
  entity: z.string().trim().nullable().optional(),
  paymentDate: z.string().trim().nullable().optional(),
  status: z.record(statusEnum).optional(),
  scheduledAt: z.record(z.string()).optional(),
});

export async function GET() {
  try {
    const repo = await getRepo();
    const data = await repo.listRheEntries();
    return NextResponse.json({ data });
  } catch (err: any) {
    console.error('[api/rhe GET]', err);
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
  const parsed = rheSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Datos invalidos' },
      { status: 400 },
    );
  }

  try {
    const repo = await getRepo();
    const d = parsed.data;
    const item = await repo.createRheEntry({
      person: d.person,
      personStatus: d.personStatus || 'Activo',
      contact: d.contact || undefined,
      area: d.area || undefined,
      partida: d.partida || undefined,
      entity: d.entity || undefined,
      paymentDate: d.paymentDate || undefined,
      status: d.status || {},
      scheduledAt: d.scheduledAt || undefined,
    });
    await repo.logActivity({
      userId: session.sub,
      userName: session.name,
      action: 'creo RHE',
      entity: 'rhe',
      entityId: item.id,
      detail: item.person,
    });
    return NextResponse.json({ data: item }, { status: 201 });
  } catch (err: any) {
    console.error('[api/rhe POST]', err);
    return NextResponse.json(
      { error: err?.message || 'No se pudo crear' },
      { status: 500 },
    );
  }
}
