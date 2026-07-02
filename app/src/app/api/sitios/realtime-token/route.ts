import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { env } from '@/lib/env';
import { getSitiosRealtimeToken } from '@/lib/sitios/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Entrega al navegador un access token de vida corta para autorizar el canal
// Realtime de Supabase (vía realtime.setAuth). No expone la contraseña ni el
// refresh token. Protegido por la sesión de la propia app.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  if (!env.sitios.enabled) {
    return NextResponse.json({ error: 'NOT_CONFIGURED' }, { status: 503 });
  }

  try {
    const data = await getSitiosRealtimeToken();
    return NextResponse.json({ data });
  } catch (err: any) {
    console.error('[api/sitios/realtime-token GET]', err);
    return NextResponse.json(
      { error: err?.message || 'No se pudo emitir token' },
      { status: 500 },
    );
  }
}
