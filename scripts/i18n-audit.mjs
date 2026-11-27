#!/usr/bin/env node
// Finds English text that shows in French or Arabic because a translation is missing.
//   node scripts/i18n-audit.mjs          → report
//   node scripts/i18n-audit.mjs --fill   → copy translations the website already has into the app dictionaries
// The app and the website keep separate dictionaries keyed by the English text; a missing key shows in English.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const FILL = process.argv.includes('--fill');

function readDict(file) {
  const out = new Map();
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*(["'])((?:\\.|(?!\1)[^\\])*)\1\s*:\s*(["'])((?:\\.|(?!\3)[^\\])*)\3,?\s*$/);
    if (m) out.set(unquote(m[1], m[2]), unquote(m[3], m[4]));
  }
  return out;
}

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.next', 'i18n', '.expo', 'dist', 'build'].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (/\.(ts|tsx)$/.test(e.name) && !/\.test\./.test(e.name)) acc.push(p);
  }
  return acc;
}

function unquote(q, body) {
  if (q === '"') return JSON.parse(`"${body}"`);
  return JSON.parse(`"${body.replace(/\\'/g, "'").replace(/"/g, '\\"')}"`);
}

// All string literals, and the ones passed straight to tr()/trn().
function scan(files) {
  const all = new Set();
  const trKeys = new Map();
  const lit = /(['"])((?:\\.|(?!\1)[^\\\n])*)\1/g;
  const trCall = /\btrn?\(\s*(['"])((?:\\.|(?!\1)[^\\\n])*)\1/g;
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8');
    for (const m of src.matchAll(lit)) {
      try { all.add(unquote(m[1], m[2])); } catch { /* not a plain string */ }
    }
    for (const m of src.matchAll(trCall)) {
      try {
        const k = unquote(m[1], m[2]);
        if (!trKeys.has(k)) trKeys.set(k, path.relative(ROOT, f));
      } catch { /* skip */ }
    }
  }
  return { all, trKeys };
}

const looksLikeText = (s) => /[A-Za-z]{2}/.test(s) && /\s|^[A-Z][a-z]+$/.test(s) && !/^[a-z0-9_.\/@:-]+$/.test(s) && !/[{}<>=;]|^https?:/.test(s.replace(/\{\d\}/g, ''));

const web = { fr: readDict(path.join(ROOT, 'lib/i18n/fr.ts')), ar: readDict(path.join(ROOT, 'lib/i18n/ar.ts')) };
const appFiles = { fr: path.join(ROOT, 'mobile/src/i18n/fr.ts'), ar: path.join(ROOT, 'mobile/src/i18n/ar.ts') };
const app = { fr: readDict(appFiles.fr), ar: readDict(appFiles.ar) };

const appScan = scan(walk(path.join(ROOT, 'mobile/src')));
const webScan = scan(['app', 'components', 'features', 'lib'].flatMap((d) => walk(path.join(ROOT, d))));

// 1. App: any literal the website already translates but the app dictionary lacks.
const filled = { fr: [], ar: [] };
for (const lang of ['fr', 'ar']) {
  for (const s of appScan.all) {
    if (!app[lang].has(s) && web[lang].has(s) && looksLikeText(s)) filled[lang].push(s);
  }
}

if (FILL) {
  for (const lang of ['fr', 'ar']) {
    if (!filled[lang].length) continue;
    const file = appFiles[lang];
    let text = fs.readFileSync(file, 'utf8');
    const add = filled[lang].map((k) => `  ${JSON.stringify(k)}: ${JSON.stringify(web[lang].get(k))},`).join('\n');
    const end = text.lastIndexOf('};');
    text = `${text.slice(0, end).replace(/\s*$/, '\n')}${add}\n${text.slice(end)}`;
    fs.writeFileSync(file, text);
    for (const k of filled[lang]) app[lang].set(k, web[lang].get(k));
  }
}

// 2. Keys passed to tr() that neither dictionary has.
function missing(trKeys, dict) {
  const out = [];
  for (const [k, f] of trKeys) {
    if (!looksLikeText(k)) continue;
    const miss = ['fr', 'ar'].filter((l) => !dict[l].has(k));
    if (miss.length) out.push({ k, f, miss });
  }
  return out;
}
const appMissing = missing(appScan.trKeys, app);
const webMissing = missing(webScan.trKeys, web);

console.log(`App: ${FILL ? 'copied' : 'can copy'} from the website → fr ${filled.fr.length}, ar ${filled.ar.length}`);
console.log(`App: tr() text with no translation → ${appMissing.length}`);
for (const m of appMissing) console.log(`  [${m.miss.join(',')}] ${JSON.stringify(m.k)}  (${m.f})`);
console.log(`Website: tr() text with no translation → ${webMissing.length}`);
for (const m of webMissing) console.log(`  [${m.miss.join(',')}] ${JSON.stringify(m.k)}  (${m.f})`);
