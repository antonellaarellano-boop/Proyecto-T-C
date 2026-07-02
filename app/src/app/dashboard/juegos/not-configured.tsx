import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dices } from 'lucide-react';

export function JuegosNotConfigured() {
  return (
    <Card>
      <CardHeader>
        <div className="flex min-w-0 items-start gap-3">
          <div className="shrink-0 rounded-xl bg-brand-gold-100 p-2 text-brand-gold-700 dark:bg-brand-gold-600/20 dark:text-brand-gold-100">
            <Dices className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <CardTitle>Juegos de mesa — falta configurar el acceso</CardTitle>
            <CardDescription>
              Datos en vivo de la app de reserva de juegos de la oficina (Supabase).
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p className="text-muted-foreground">
          Para leer la data agregá estas variables a <code>app/.env.local</code> y
          reiniciá el servidor de desarrollo:
        </p>
        <pre className="overflow-x-auto rounded-lg bg-muted/50 p-3 text-xs">
{`JUEGOS_SUPABASE_URL="https://kascrqbtxmwlswecljmz.supabase.co"
JUEGOS_SUPABASE_ANON_KEY="<anon / publishable key>"`}
        </pre>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li>La URL y la anon/publishable key son públicas (la seguridad la da el RLS).</li>
          <li>El acceso es de solo lectura: el apartado solo muestra estadísticas de reservas.</li>
        </ul>
      </CardContent>
    </Card>
  );
}
