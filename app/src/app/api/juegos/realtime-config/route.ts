import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { env } from '@/lib/env';
import { getJuegosRealtimeConfig } from '@/lib/juegos/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Entrega al navegador la URL + anon key públicas para que abra su propio canal
// Realtime de Supabase. La anon/publishable key es pública por diseño y el RLS
// de SELECT abierto permite la suscripción sin login. Protegido por la sesión
// de la propia app para no exponer el endpoint a cualquiera.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  if (!env.juegos.enabled) {
    return NextResponse.json({ error: 'NOT_CONFIGURED' }, { status: 503 });
  }

  try {
    const data = getJuegosRealtimeConfig();
    return NextResponse.json({ data });
  } catch (err: any) {
    console.error('[api/juegos/realtime-config GET]', err);
    return NextResponse.json(
      { error: err?.message || 'No se pudo emitir config' },
      { status: 500 },
    );
  }
}
