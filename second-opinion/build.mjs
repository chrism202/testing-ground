import { copyFile, mkdir, rm, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const catalog = require('./data/catalog.json');
const { sourcePage } = require('./lib/source-page');
const { designPage } = require('./lib/design-page');

const output = new URL('./public/', import.meta.url);
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

for (const file of ['index.html', 'about.html', 'style.css', 'designs.css', 'app.js']) {
  await copyFile(new URL(file, import.meta.url), new URL(file, output));
}

const about = await readFile(new URL('./about.html', import.meta.url), 'utf8');
await writeFile(new URL('sources.html', output), sourcePage(about, catalog));
for (const kind of ['dashboard', 'review']) {
  await writeFile(new URL(kind + '.html', output), designPage(kind, catalog));
}

if (process.env.DATABASE_URL) {
  await require('./scripts/migrate').migrate();
  await require('./scripts/test-database').testDatabase();
}

console.log('Built static site in public/');
