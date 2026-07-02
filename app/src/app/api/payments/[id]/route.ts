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

const patchSchema = z.object({
  name: z.string().trim().min(1).optional(),
  provider: z.string().trim().nullable().optional(),
  partida: z.string().trim().nullable().optional(),
  sender: z.string().trim().nullable().optional(),
  paymentDate: z.string().trim().nullable().optional(),
  status: z.record(statusEnum).optional(),
  scheduledAt: z.record(z.string()).optional(),
  paidAt: z.record(z.string()).optional(),
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

  // status se mergea en el repo; el resto: null -> undefined.
  const { status, ...rest } = parsed.data;
  const patch: Record<string, any> = {};
  for (const [k, v] of Object.entries(rest)) {
    patch[k] = v === null ? undefined : v;
  }
  if (status) patch.status = status;

  try {
    const repo = await getRepo();
    const item = await repo.updateFixedPayment(params.id, patch);
    await repo.logActivity({
      userId: session.sub,
      userName: session.name,
      action: 'actualizo pago fijo',
      entity: 'pago',
      entityId: item.id,
    });
    return NextResponse.json({ data: item });
  } catch (err: any) {
    console.error('[api/payments PATCH]', err);
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
  if (session.role === 'viewer')
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });

  try {
    const repo = await getRepo();
    await repo.deleteFixedPayment(params.id);
    await repo.logActivity({
      userId: session.sub,
      userName: session.name,
      action: 'elimino pago fijo',
      entity: 'pago',
      entityId: params.id,
    });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[api/payments DELETE]', err);
    return NextResponse.json(
      { error: err?.message || 'No se pudo eliminar' },
      { status: 500 },
    );
  }
}
