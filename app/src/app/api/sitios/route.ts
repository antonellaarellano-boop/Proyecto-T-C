import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { env } from '@/lib/env';
import { getSitiosSnapshot } from '@/lib/sitios/queries';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  if (!env.sitios.enabled) {
    return NextResponse.json(
      { error: 'NOT_CONFIGURED', message: 'Faltan credenciales de Sitios en .env.local' },
      { status: 503 },
    );
  }

  try {
    const data = await getSitiosSnapshot();
    return NextResponse.json({ data });
  } catch (err: any) {
    console.error('[api/sitios GET]', err);
    return NextResponse.json(
      { error: err?.message || 'No se pudo leer Sitios' },
      { status: 500 },
    );
  }
}
