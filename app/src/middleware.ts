import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const COOKIE = 'bcrt_session';
const PUBLIC_PATHS = [
  '/login',
  '/forgot-password',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/forgot',
  '/_next',
  '/favicon',
  '/brand',
];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

// Mismo criterio que lib/env.ts, repetido aca a proposito: el middleware corre
// en el runtime Edge y no conviene arrastrar el modulo de entorno completo.
// En produccion AUTH_SECRET es obligatorio; en dev hay fallback.
function authSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('[middleware] AUTH_SECRET ausente o demasiado corto en produccion.');
  }
  return secret || 'dev-only-secret-please-change-me-in-production-environment-now';
}

async function verify(token: string) {
  try {
    const secret = new TextEncoder().encode(authSecret());
    const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] });
    return payload as { sub: string; role: string };
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();

  const token = req.cookies.get(COOKIE)?.value;
  const session = token ? await verify(token) : null;

  if (!session) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('from', pathname);
    return NextResponse.redirect(url);
  }

  // Rutas solo admin
  const adminOnly = ['/dashboard/admin', '/api/admin'];
  if (adminOnly.some((p) => pathname.startsWith(p)) && session.role !== 'admin') {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }
    const url = req.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except static assets and Next internals.
     */
    '/((?!_next/static|_next/image|favicon.ico|brand/|api/health).*)',
  ],
};
