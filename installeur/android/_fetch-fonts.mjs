// Téléchargement des polices Google Fonts (Barlow Condensed, Inter)
// sous-ensembles latin/latin-ext, en woff2, + licences OFL 1.1.
// Sortie : installeur/android/fonts/ (source, copiée vers les assets
// APK par _sync-assets.mjs ; servie par AssetRouter /css2 + /gfont/).
import { mkdir, writeFile } from 'node:fs/promises';

const OUT = 'D:/VS Code/dcc-sheet/installeur/android/fonts';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
  + '(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const CSS_URL = 'https://fonts.googleapis.com/css2?'
  + 'family=Barlow+Condensed:wght@600;700;800'
  + '&family=Inter:wght@400;500;600&display=swap';

const KEEP = new Set(['latin', 'latin-ext']);

async function get(url) {
  const r = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!r.ok) throw new Error(url + ' -> ' + r.status);
  return r;
}

await mkdir(OUT, { recursive: true });

const css = await (await get(CSS_URL)).text();

/* Google prefixe chaque @font-face d'un commentaire de sous-ensemble. */
const blocks = [...css.matchAll(/\/\*\s*([\w-]+)\s*\*\/\s*(@font-face\s*\{[^}]*\})/g)];
const out = [];
const seen = new Set();
let n = 0;
for (const [, subset, block] of blocks) {
  if (!KEEP.has(subset)) continue;
  const m = block.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/);
  if (!m) continue;
  const url = m[1];
  const name = url.split('/').pop();
  if (!seen.has(name)) {
    const data = Buffer.from(await (await get(url)).arrayBuffer());
    await writeFile(OUT + '/' + name, data);
    seen.add(name);
    n++;
    console.log('woff2 ' + name + ' ' + Math.round(data.length / 1024) + ' Ko');
  }
  out.push(block.replace(m[0], 'url(https://appassets.androidplatform.net/gfont/' + name + ')'));
}
await writeFile(OUT + '/fonts.css', out.join('\n') + '\n', 'utf8');
console.log('fonts.css : ' + out.length + ' @font-face, ' + n + ' fichiers woff2');

for (const [fam, src] of [
  ['OFL-barlowcondensed.txt', 'https://raw.githubusercontent.com/google/fonts/main/ofl/barlowcondensed/OFL.txt'],
  ['OFL-inter.txt', 'https://raw.githubusercontent.com/google/fonts/main/ofl/inter/OFL.txt'],
]) {
  const txt = await (await get(src)).text();
  await writeFile(OUT + '/' + fam, txt, 'utf8');
  console.log('licence ' + fam + ' ' + txt.length + ' octets');
}
