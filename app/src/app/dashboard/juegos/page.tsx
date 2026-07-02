import { env } from '@/lib/env';
import { getJuegosSnapshot } from '@/lib/juegos/queries';
import { JuegosClient } from './juegos-client';
import { JuegosNotConfigured } from './not-configured';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata = { title: 'Juegos de mesa · Reservas' };
export const dynamic = 'force-dynamic';

export default async function Page() {
  if (!env.juegos.enabled) {
    return <JuegosNotConfigured />;
  }

  try {
    const snapshot = await getJuegosSnapshot();
    return <JuegosClient initial={snapshot} />;
  } catch (err: any) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Juegos de mesa — no se pudo conectar</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Hubo un problema al leer las reservas de juegos en Supabase:
          </p>
          <pre className="mt-2 overflow-x-auto rounded-lg bg-muted/50 p-3 text-xs text-destructive">
            {String(err?.message || err)}
          </pre>
          <p className="mt-2 text-xs text-muted-foreground">
            Verificá <code>JUEGOS_SUPABASE_URL</code> y <code>JUEGOS_SUPABASE_ANON_KEY</code> en{' '}
            <code>.env.local</code>.
          </p>
        </CardContent>
      </Card>
    );
  }
}
