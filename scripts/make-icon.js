// Draws the closet's hanger icon and saves it as closet.ico. Run with: npx electron scripts/make-icon.js
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff5a8a"/><stop offset="1" stop-color="#8a6cf0"/></linearGradient></defs>
<rect x="8" y="8" width="240" height="240" rx="56" fill="url(#g)"/>
<path d="M128 52a20 20 0 0 1 7 38.6c-4.6 2-7 6-7 10.7V112M128 112 40 182h176z" fill="none" stroke="#fff" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M196 42l5 12 12 5-12 5-5 12-5-12-12-5 12-5z" fill="#fff"/></svg>`;

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
