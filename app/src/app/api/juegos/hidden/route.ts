import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth/session';
import {
  listHiddenJuegos,
  hideJuego,
  unhideJuego,
} from '@/lib/data/juegos-hidden-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET → lista de reservationId ocultados en este sistema.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  try {
    const data = await listHiddenJuegos();
    return NextResponse.json({ data });
  } catch (err: any) {
    console.error('[api/juegos/hidden GET]', err);
    return NextResponse.json(
      { error: err?.message || 'No se pudo leer' },
      { status: 500 },
    );
  }
}

const schema = z.object({
  reservationId: z.string().trim().min(1),
  // hidden=true oculta; false restaura.
  hidden: z.boolean(),
});

// POST → oculta/restaura una reserva SOLO en este sistema (nunca toca Supabase).
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  if (session.role === 'viewer')
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Datos invalidos' },
      { status: 400 },
    );
  }

  const { reservationId, hidden } = parsed.data;
  try {
    if (hidden) await hideJuego(reservationId);
    else await unhideJuego(reservationId);
    return NextResponse.json({ data: { reservationId, hidden } });
  } catch (err: any) {
    console.error('[api/juegos/hidden POST]', err);
    return NextResponse.json(
      { error: err?.message || 'No se pudo actualizar' },
      { status: 500 },
    );
  }
}
