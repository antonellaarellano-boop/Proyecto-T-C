import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth/session';
import { listWalkins, addWalkin } from '@/lib/data/sitios-walkins-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET → lista de walk-ins (personas que vinieron sin reservar).
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  try {
    const data = await listWalkins();
    return NextResponse.json({ data });
  } catch (err: any) {
    console.error('[api/sitios/walkins GET]', err);
    return NextResponse.json(
      { error: err?.message || 'No se pudo leer' },
      { status: 500 },
    );
  }
}

const schema = z.object({
  date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
  person: z.string().trim().min(1, 'Falta el nombre'),
  floorId: z.number().int().nullable().optional(),
  notes: z.string().trim().max(300).nullable().optional(),
});

// POST → registra un walk-in. SOLO en el sistema (no toca Desk Buddy).
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

  try {
    const item = await addWalkin({
      date: parsed.data.date,
      person: parsed.data.person,
      floorId: parsed.data.floorId ?? null,
      notes: parsed.data.notes ?? null,
    });
    return NextResponse.json({ data: item });
  } catch (err: any) {
    console.error('[api/sitios/walkins POST]', err);
    return NextResponse.json(
      { error: err?.message || 'No se pudo registrar' },
      { status: 500 },
    );
  }
}
