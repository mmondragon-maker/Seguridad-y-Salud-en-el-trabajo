/** Standalone, read-only visual demo. Always uses newly seeded fictitious data. */
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { createDatabase } from '../server/db.ts';
import { createApp } from '../server/app.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');
const db = createDatabase(':memory:');
const server = createApp(db, { ai: false }).listen(0, '127.0.0.1');
const snapshot: Record<string, unknown> = {};
try {
  await once(server, 'listening');
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  for (const route of ['health', 'company', 'dashboard', 'obligations', 'workers', 'trainings', 'risks', 'documents']) {
    const response = await fetch(`${base}/api/${route}`);
    if (!response.ok) throw new Error(`No se pudo preparar /api/${route}`);
    snapshot[`/api/${route}`] = await response.json();
  }
} finally {
  await new Promise<void>((done) => server.close(() => done()));
  db.close();
}

let html = await readFile(resolve(dist, 'index.html'), 'utf8');
const scriptPath = html.match(/<script[^>]*src="([^"]+)"[^>]*><\/script>/)?.[1];
const stylePath = html.match(/<link[^>]*href="([^"]+\.css)"[^>]*>/)?.[1];
if (!scriptPath || !stylePath) throw new Error('Ejecuta npm run build antes de exportar la demostración.');
const js = (await readFile(resolve(dist, `.${scriptPath}`), 'utf8')).replace(/<\/script/gi, '<\\/script');
const css = await readFile(resolve(dist, `.${stylePath}`), 'utf8');
const data = JSON.stringify(snapshot).replace(/</g, '\\u003c');
const adapter = `
const demoSnapshot = ${data};
window.fetch = async function(input, init = {}) {
  const pathname = new URL(typeof input === 'string' ? input : input.url, 'https://nexo-demo.invalid/').pathname;
  const method = (init.method || input.method || 'GET').toUpperCase();
  const reply = (data, status = 200) => Promise.resolve(new Response(JSON.stringify(data), {status, headers: {'Content-Type':'application/json'}}));
  if (pathname === '/api/audit/query' && method === 'POST') return reply({answer:'Esta demostración es de solo lectura y no conecta con un modelo de IA. En la aplicación completa puedes incorporar fuentes oficiales revisadas y consultar sus extractos. El ejemplo no contiene un corpus legal validado.', citations:[], mode:'retrieval', requiresReview:true, notice:'Demostración sin servidor; datos ficticios. No se ejecutó una búsqueda normativa ni una llamada de IA.'});
  if (method !== 'GET') return reply({error:'Demostración de solo lectura. Para guardar cambios utiliza la aplicación con su servidor.'}, 405);
  return pathname in demoSnapshot ? reply(demoSnapshot[pathname]) : reply({error:'Recurso no incluido en la demostración.'},404);
};
function disableDemoWrites() {
  for (const button of document.querySelectorAll('button')) {
    const label = button.textContent.trim();
    const aria = button.getAttribute('aria-label') || '';
    if (/^Guardar|^Marcar revisado|^Retirar revisión/.test(label) || /^Eliminar/.test(aria)) {
      if (!button.disabled) button.disabled = true;
      if (!button.title) button.title = 'Solo lectura: abre la aplicación con servidor para guardar cambios.';
    }
  }
}
new MutationObserver(disableDemoWrites).observe(document.documentElement, {childList:true,subtree:true});
`;
html = html.replace(/<script[^>]*src="[^"]+"[^>]*><\/script>/, '');
html = html.replace(/<link[^>]*href="[^"]+\.css"[^>]*>/, () => `<style>${css}</style>`);
html = html.replace('</head>', `<style>
.offline-banner{position:fixed;inset:0 0 auto;z-index:9999;height:48px;display:flex;align-items:center;justify-content:center;padding:4px 16px;background:#d7f29b;color:#173c30;text-align:center;font:600 12px/1.4 system-ui,sans-serif;box-sizing:border-box}
#root{padding-top:48px}.sidebar{top:48px!important}.sidebar-scrim{top:48px!important}
@media print{.offline-banner{display:none}#root{padding-top:0}}
</style></head>`);
html = html.replace('<body>', '<body><div class="offline-banner" role="note">DEMOSTRACIÓN SIN CONEXIÓN · Solo lectura · Datos ficticios · IA no conectada</div>');
html = html.replace('</body>', () => `<script>${adapter}</script><script type="module">${js}</script></body>`);
html = html.replace('<title>Nexo EHS · Gestión integral</title>', '<title>Nexo EHS · Demostración navegable</title>');
const output = resolve(dist, 'nexo-ehs-demo.html');
await writeFile(output, html);
console.log(`Demostración de solo lectura creada: ${output}`);
