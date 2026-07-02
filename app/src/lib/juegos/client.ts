// Cliente Supabase server-only para el apartado "Juegos de mesa".
// Lee la data en vivo del proyecto Supabase de la app de reserva de juegos de la
// oficina. El RLS de SELECT es público, así que basta la anon/publishable key
// (no hace falta iniciar sesión con un usuario). Cacheamos el cliente.
import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';

let cached: SupabaseClient | null = null;

/**
 * Devuelve un cliente Supabase (anon) para leer las reservas de juegos.
 * Lanza si faltan credenciales.
 */
export function getJuegosClient(): SupabaseClient {
  if (!env.juegos.enabled) {
    throw new Error(
      'Juegos no está configurado: faltan JUEGOS_SUPABASE_URL / JUEGOS_SUPABASE_ANON_KEY en .env.local',
    );
  }
  if (cached) return cached;
  cached = createClient(env.juegos.url, env.juegos.anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  return cached;
}

/**
 * Config pública (URL + anon key) que el navegador usa para abrir su propio
 * canal Realtime. La anon/publishable key es pública por diseño; el RLS de
 * SELECT abierto permite suscribirse a los cambios de `reservas` sin login.
 */
export function getJuegosRealtimeConfig(): { url: string; anonKey: string } {
  if (!env.juegos.enabled) {
    throw new Error('Juegos no está configurado');
  }
  return { url: env.juegos.url, anonKey: env.juegos.anonKey };
}
