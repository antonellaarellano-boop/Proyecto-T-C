import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2 } from 'lucide-react';

export function SitiosNotConfigured() {
  return (
    <Card>
      <CardHeader>
        <div className="flex min-w-0 items-start gap-3">
          <div className="shrink-0 rounded-xl bg-brand-blue-100 p-2 text-brand-blue-700 dark:bg-brand-blue-600/20 dark:text-brand-blue-100">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <CardTitle>Sitios — falta configurar el acceso</CardTitle>
            <CardDescription>
              Datos en vivo de Desk Buddy (reserva de escritorios) desde Supabase.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p className="text-muted-foreground">
          Para leer la data hace falta un usuario dedicado de solo lectura del proyecto
          Supabase. Agregá estas variables a <code>app/.env.local</code> y reiniciá el
          servidor de desarrollo:
        </p>
        <pre className="overflow-x-auto rounded-lg bg-muted/50 p-3 text-xs">
{`SITIOS_SUPABASE_URL="https://ivacvjgdzhcffakbohtb.supabase.co"
SITIOS_SUPABASE_ANON_KEY="<anon key pública>"
SITIOS_SUPABASE_EMAIL="<email del usuario dedicado>"
SITIOS_SUPABASE_PASSWORD="<contraseña del usuario dedicado>"`}
        </pre>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li>La URL y la anon key son públicas (la seguridad la da el RLS).</li>
          <li>
            El email/contraseña son de un usuario <strong>regular</strong> del proyecto;
            cualquiera con sesión puede leer escritorios, reservas y perfiles.
          </li>
          <li>Estas variables viven solo en el servidor — no se exponen al navegador.</li>
        </ul>
      </CardContent>
    </Card>
  );
}
