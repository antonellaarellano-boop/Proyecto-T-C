// Cliente Supabase server-only para el apartado "Sitios".
// Lee la data en vivo del proyecto Supabase de Desk Buddy (reserva de
// escritorios). Las políticas RLS exigen usuario autenticado, así que iniciamos
// sesión con un usuario dedicado de solo lectura (credenciales en .env.local,
// nunca en el navegador). Cacheamos el cliente y refrescamos la sesión cuando
// está por expirar.
import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';

let cached: SupabaseClient | null = null;
// epoch (segundos) en que expira el access token de la sesión cacheada.
let sessionExpiresAt = 0;

function makeClient(): SupabaseClient {
  return createClient(env.sitios.url, env.sitios.anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

// Traduce un correo/DNI al email de auth interno usando la edge function
// resolve-login del proyecto. Si la respuesta no trae auth_email (p. ej. la
// función no existe), cae al valor original para no romper.
async function resolveAuthEmail(identifier: string): Promise<string> {
  try {
    const res = await fetch(`${env.sitios.url}/functions/v1/resolve-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: env.sitios.anonKey,
        Authorization: `Bearer ${env.sitios.anonKey}`,
      },
      body: JSON.stringify({ identifier }),
    });
    const json = await res.json().catch(() => ({}));
    return (json as any)?.auth_email || identifier;
  } catch {
    return identifier;
  }
}

/**
 * Devuelve un cliente Supabase autenticado como el usuario dedicado. Reutiliza
 * la sesión mientras siga vigente (con 60s de margen) y reinicia sesión cuando
 * caduca. Lanza si faltan credenciales o si el login falla.
 */
export async function getSitiosClient(): Promise<SupabaseClient> {
  if (!env.sitios.enabled) {
    throw new Error(
      'Sitios no está configurado: faltan SITIOS_SUPABASE_URL / ANON_KEY / EMAIL / PASSWORD en .env.local',
    );
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (cached && sessionExpiresAt - 60 > nowSec) return cached;

  const client = cached ?? makeClient();

  // Desk Buddy usa login personalizado: el email real se resuelve primero a un
  // email sintético interno (dni-<DNI>@deskflow.local) vía la edge function
  // resolve-login, y ESE es el que acepta signInWithPassword.
  const authEmail = await resolveAuthEmail(env.sitios.email);

  const { data, error } = await client.auth.signInWithPassword({
    email: authEmail,
    password: env.sitios.password,
  });
  if (error) {
    throw new Error(`No se pudo autenticar en Supabase (Sitios): ${error.message}`);
  }
  sessionExpiresAt = data.session?.expires_at ?? nowSec + 3600;
  cached = client;
  return client;
}

/**
 * Token de acceso (JWT) vigente del usuario dedicado, para que el navegador
 * autorice el canal Realtime vía `realtime.setAuth(token)`. No expone la
 * contraseña ni el refresh token: solo un access token de vida corta.
 */
export async function getSitiosRealtimeToken(): Promise<{
  token: string;
  expiresAt: number;
  url: string;
  anonKey: string;
}> {
  const client = await getSitiosClient();
  const { data } = await client.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('No hay sesión activa para Realtime');
  return {
    token,
    expiresAt: sessionExpiresAt,
    url: env.sitios.url,
    anonKey: env.sitios.anonKey,
  };
}
