// Crea la tabla "Sitios Asistencia" en el Airtable de la app (Talento) para
// guardar el "Llegó / No llegó" por reserva (dato propio, no existe en Desk Buddy).
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '..', '.env.local');
const env = fs.readFileSync(envPath, 'utf8');
function val(key) {
  const m = env.match(new RegExp(`^${key}\\s*=\\s*"?([^"\\r\\n]+)"?`, 'm'));
  return m ? m[1].trim() : null;
}
const TOKEN = val('AIRTABLE_TOKEN');
const BASE = val('AIRTABLE_BASE_ID');

(async () => {
  const url = `https://api.airtable.com/v0/meta/bases/${BASE}/tables`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Sitios Asistencia',
      description:
        'Asistencia (Llegó / No llegó) por reserva de Desk Buddy. Clave: Reserva ID.',
      fields: [
        { name: 'Reserva ID', type: 'singleLineText' },
        { name: 'Fecha', type: 'singleLineText' },
        { name: 'Persona', type: 'singleLineText' },
        { name: 'Escritorio', type: 'singleLineText' },
        { name: 'Piso', type: 'number', options: { precision: 0 } },
        {
          name: 'Estado',
          type: 'singleSelect',
          options: { choices: [{ name: 'Llegó' }, { name: 'No llegó' }] },
        },
      ],
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (res.status === 200) console.log('✅ Tabla creada:', json.id);
  else console.log(`⚠️  ${res.status} ${JSON.stringify(json.error || json)}`);
})();
