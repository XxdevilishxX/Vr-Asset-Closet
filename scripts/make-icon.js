// Draws the closet's hanger icon and saves it as closet.ico. Run with: npx electron scripts/make-icon.js
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffc2dc"/><stop offset="1" stop-color="#c9b0ff"/></linearGradient>
  <linearGradient id="wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff7fb"/><stop offset="1" stop-color="#ffe3ef"/></linearGradient>
</defs>
<rect x="8" y="8" width="240" height="240" rx="60" fill="url(#bg)"/>
<!-- little wardrobe with a happy face -->
<rect x="66" y="188" width="18" height="24" rx="7" fill="#6b3f7a"/><rect x="172" y="188" width="18" height="24" rx="7" fill="#6b3f7a"/>
<rect x="50" y="62" width="156" height="136" rx="34" fill="url(#wood)" stroke="#6b3f7a" stroke-width="9"/>
<path d="M128 70v120" stroke="#6b3f7a" stroke-width="7" stroke-linecap="round"/>
<circle cx="116" cy="118" r="5.5" fill="#6b3f7a"/><circle cx="140" cy="118" r="5.5" fill="#6b3f7a"/>
<ellipse cx="94" cy="140" rx="11" ry="13" fill="#3d2347"/><ellipse cx="162" cy="140" rx="11" ry="13" fill="#3d2347"/>
<circle cx="98" cy="135" r="4" fill="#fff"/><circle cx="166" cy="135" r="4" fill="#fff"/>
<ellipse cx="80" cy="162" rx="12" ry="7" fill="#ff8fbd" opacity=".85"/><ellipse cx="176" cy="162" rx="12" ry="7" fill="#ff8fbd" opacity=".85"/>
<path d="M114 160q14 14 28 0" fill="none" stroke="#3d2347" stroke-width="6" stroke-linecap="round"/>
<!-- bow on top -->
<path d="M128 62 96 44q-8 18 0 36zM128 62l32-18q8 18 0 36z" fill="#ff5a9a" stroke="#6b3f7a" stroke-width="6" stroke-linejoin="round"/>
<circle cx="128" cy="62" r="11" fill="#ff5a9a" stroke="#6b3f7a" stroke-width="6"/>
<!-- sparkles -->
<path d="M206 30l6 15 15 6-15 6-6 15-6-15-15-6 15-6z" fill="#fff"/>
<path d="M44 196l4 10 10 4-10 4-4 10-4-10-10-4 10-4z" fill="#fff"/>
<circle cx="218" cy="96" r="5" fill="#fff" opacity=".9"/></svg>`;

app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 256, height: 256, show: false, frame: false, transparent: true,
    webPreferences: { offscreen: true } });
  await win.loadURL('data:text/html,' + encodeURIComponent(
    `<body style="margin:0;background:transparent">${svg}</body>`));
  await new Promise(r => setTimeout(r, 300));
  const img = await win.webContents.capturePage({ x: 0, y: 0, width: 256, height: 256 });
  // An .ico holding PNGs (Windows Vista and later read these)
  const sizes = [256, 48, 32, 16].map(s => img.resize({ width: s, height: s, quality: 'best' }).toPNG());
  const head = Buffer.alloc(6 + 16 * sizes.length);
  head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(sizes.length, 4);
  let off = head.length;
  [256, 48, 32, 16].forEach((s, i) => {
    const e = 6 + 16 * i;
    head.writeUInt8(s === 256 ? 0 : s, e); head.writeUInt8(s === 256 ? 0 : s, e + 1);
    head.writeUInt16LE(1, e + 4); head.writeUInt16LE(32, e + 6);
    head.writeUInt32LE(sizes[i].length, e + 8); head.writeUInt32LE(off, e + 12);
    off += sizes[i].length;
  });
  fs.writeFileSync(path.join(__dirname, '..', 'closet.ico'), Buffer.concat([head, ...sizes]));
  fs.writeFileSync(path.join(__dirname, '..', 'closet.png'), sizes[0]);
  app.quit();
});
