import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { deleteWalkin } from '@/lib/data/sitios-walkins-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// DELETE → borra un walk-in del sistema (recruiter + admin).
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  if (session.role === 'viewer')
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });

  try {
    await deleteWalkin(params.id);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[api/sitios/walkins/[id] DELETE]', err);
    return NextResponse.json(
      { error: err?.message || 'No se pudo eliminar' },
      { status: 500 },
    );
  }
}
