import { env } from '@/lib/env';
import { getSitiosPastReservations } from '@/lib/sitios/queries';
import { getRepo } from '@/lib/data/repository';
import { listWalkins } from '@/lib/data/sitios-walkins-store';
import { AnterioresClient } from './anteriores-client';
import { SitiosNotConfigured } from '../not-configured';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata = { title: 'Sitios · Reservas anteriores' };
export const dynamic = 'force-dynamic';

export default async function Page() {
  if (!env.sitios.enabled) {
    return <SitiosNotConfigured />;
  }

  try {
    const [past, repo, walkins] = await Promise.all([
      getSitiosPastReservations(),
      getRepo(),
      listWalkins(),
    ]);
    const attendanceRows = await repo.listSitioAttendance();
    const attendance: Record<string, string> = {};
    for (const a of attendanceRows) attendance[a.reservationId] = a.status;
    return (
      <AnterioresClient data={past} initialAttendance={attendance} walkins={walkins} />
    );
  } catch (err: any) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Reservas anteriores — no se pudo conectar</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="overflow-x-auto rounded-lg bg-muted/50 p-3 text-xs text-destructive">
            {String(err?.message || err)}
          </pre>
        </CardContent>
      </Card>
    );
  }
}
