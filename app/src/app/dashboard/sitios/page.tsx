import { env } from '@/lib/env';
import { getSitiosSnapshot } from '@/lib/sitios/queries';
import { getRepo } from '@/lib/data/repository';
import { listWalkins } from '@/lib/data/sitios-walkins-store';
import { SitiosClient } from './sitios-client';
import { SitiosNotConfigured } from './not-configured';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata = { title: 'Sitios · Reserva de escritorios' };
export const dynamic = 'force-dynamic';

export default async function Page() {
  if (!env.sitios.enabled) {
    return <SitiosNotConfigured />;
  }

  try {
    const [snapshot, repo, walkins] = await Promise.all([
      getSitiosSnapshot(),
      getRepo(),
      listWalkins(),
    ]);
    const attendanceRows = await repo.listSitioAttendance();
    const attendance: Record<string, string> = {};
    for (const a of attendanceRows) attendance[a.reservationId] = a.status;
    return (
      <SitiosClient
        initial={snapshot}
        initialAttendance={attendance}
        initialWalkins={walkins}
      />
    );
  } catch (err: any) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sitios — no se pudo conectar</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Hubo un problema al leer los datos de Desk Buddy en Supabase:
          </p>
          <pre className="mt-2 overflow-x-auto rounded-lg bg-muted/50 p-3 text-xs text-destructive">
            {String(err?.message || err)}
          </pre>
          <p className="mt-2 text-xs text-muted-foreground">
            Verificá las credenciales en <code>.env.local</code> (usuario dedicado de
            solo lectura) y que el usuario exista en el proyecto Supabase.
          </p>
        </CardContent>
      </Card>
    );
  }
}
