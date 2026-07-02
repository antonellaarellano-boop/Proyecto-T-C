import { getRepo } from '@/lib/data/repository';
import { GastosPorEvento } from '../gastos-por-evento';

export const metadata = { title: 'Engagement · Gastos por actividades del mes' };
export const dynamic = 'force-dynamic';

export default async function Page() {
  const repo = await getRepo();
  const [gastoEventos, expenses] = await Promise.all([
    repo.listEngagementGastoEventos(),
    repo.listEngagementExpenses(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Gastos por actividades del mes
        </h1>
        <p className="text-sm text-muted-foreground">
          Registrá tus actividades y cargá sus gastos por mes
        </p>
      </div>
      <GastosPorEvento initialEvents={gastoEventos} initialExpenses={expenses} />
    </div>
  );
}
