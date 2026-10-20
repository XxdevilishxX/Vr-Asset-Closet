// Runs after "npm install": deletes Electron's translation files for languages the closet never shows
// (about 40 MB). The closet has no menus or dialogs that need them; Electron falls back to English.
const fs = require('fs');
const path = require('path');

const KEEP = new Set(['en-US.pak', 'en-GB.pak']);
const dir = path.join(__dirname, '..', 'node_modules', 'electron', 'dist', 'locales');

if (!fs.existsSync(dir)) process.exit(0);   // Electron not downloaded (yet): nothing to trim
let removed = 0, bytes = 0;
for (const f of fs.readdirSync(dir)) {
  if (!f.endsWith('.pak') || KEEP.has(f)) continue;
  const p = path.join(dir, f);
  bytes += fs.statSync(p).size;
  fs.unlinkSync(p);
  removed++;
}
if (removed) console.log(`trim-electron: removed ${removed} unused language files (${(bytes / 1048576).toFixed(0)} MB)`);
