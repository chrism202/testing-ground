import { copyFile, mkdir, rm } from 'node:fs/promises';

const output = new URL('./public/', import.meta.url);
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

for (const file of ['index.html', 'about.html', 'style.css', 'app.js']) {
  await copyFile(new URL(file, import.meta.url), new URL(file, output));
}

console.log('Built static site in public/');
