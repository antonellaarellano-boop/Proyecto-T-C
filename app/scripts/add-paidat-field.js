// Crea el campo "Pago Real Fechas" (long text con JSON) en las tablas Pagos y RHE.
// Idempotente: si el campo ya existe (422 DUPLICATE_OR_EMPTY), lo informa y sigue.
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
const TABLES = {
  Pagos: 'tblX3EuRiGsY72tSS',
  RHE: 'tblzGSgMmOXBUEdA1',
};

async function createField(tableId) {
  const url = `https://api.airtable.com/v0/meta/bases/${BASE}/tables/${tableId}/fields`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'Pago Real Fechas',
      type: 'multilineText',
      description: 'JSON { mesKey: "YYYY-MM-DD" } con la fecha real de pago por mes.',
    }),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

(async () => {
  for (const [label, id] of Object.entries(TABLES)) {
    const { status, json } = await createField(id);
    if (status === 200) console.log(`✅ ${label}: campo creado (${json.id})`);
    else console.log(`⚠️  ${label}: ${status} ${JSON.stringify(json.error || json)}`);
  }
})();
