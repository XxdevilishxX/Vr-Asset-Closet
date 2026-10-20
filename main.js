const { app, BrowserWindow, ipcMain, nativeImage, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const importer = require('./importer');

app.setName('VR Closet');
const DATA = app.getPath('userData');            // %APPDATA%\VR Closet
const FILE = path.join(DATA, 'closet.json');
const IMAGES = path.join(DATA, 'images');
const ORDER = ['Avatars', 'Bases', 'Tops', 'Bottoms', 'Dresses', 'Sets', 'Shoes', 'Hair',
  'Accessories', 'Flow Toys', 'Skins & Textures', 'Decals'];

fs.mkdirSync(IMAGES, { recursive: true });
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

function load() {
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { return null; }
}
function save(state) {
  const tmp = FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(state));   // write fully first so a crash can't leave half a file
  fs.copyFileSync(tmp, FILE);                      // (rename fails with EXDEV on some setups)
  fs.unlinkSync(tmp);
}

// Copies a photo into the closet as a small thumbnail; returns its file name, or '' if unreadable.
function thumb(src) {
  const id = newId();
  try {
    const img = nativeImage.createFromPath(src);
    if (img.isEmpty()) {                          // gif/webp: Chromium shows these as-is
      const name = id + path.extname(src).toLowerCase();
      fs.copyFileSync(src, path.join(IMAGES, name));
      return name;
    }
    const { width, height } = img.getSize(), k = Math.min(1, 480 / Math.max(width, height));
    const small = img.resize({ width: Math.round(width * k), height: Math.round(height * k), quality: 'good' });
    const png = /\.png$/i.test(src);              // keep transparency for PNGs
    const name = id + (png ? '.png' : '.jpg');
    fs.writeFileSync(path.join(IMAGES, name), png ? small.toPNG() : small.toJPEG(85));
    return name;
  } catch { return ''; }
}

// Adds everything in the avatar folder that isn't in the closet yet (deleted items stay deleted).
function rescan() {
  const S = load() || { items: [], cats: [], outfits: [] };
  S.imported = S.imported || [];
  S.outfits = S.outfits || [];
  const done = new Set(S.imported);
  let added = 0;
  for (const it of importer.scan()) {
    if (done.has(it.key)) continue;
    S.items.push({
      id: newId(), key: it.key, name: it.name, cat: it.cat, src: it.src,
      img: it.photo ? thumb(it.photo) : '', note: ''
    });
    if (!S.cats.includes(it.cat)) S.cats.push(it.cat);
    S.imported.push(it.key);
    added++;
  }
  S.cats.sort((a, b) => (ORDER.indexOf(a) + 1 || 99) - (ORDER.indexOf(b) + 1 || 99));
  S.updated = new Date().toISOString();
  save(S);
  return { added, state: S };
}

ipcMain.on('load', e => { e.returnValue = { state: load(), imgBase: pathToFileURL(IMAGES).href + '/' }; });
ipcMain.on('save', (e, state) => {
  try { save(state); e.returnValue = true; } catch { e.returnValue = false; }
});
ipcMain.on('save-image', (e, dataUrl) => {
  const m = /^data:image\/(\w+);base64,(.*)$/.exec(dataUrl || '');
  if (!m) { e.returnValue = ''; return; }
  const name = newId() + (m[1] === 'png' ? '.png' : '.jpg');
  fs.writeFileSync(path.join(IMAGES, name), Buffer.from(m[2], 'base64'));
  e.returnValue = name;
});
ipcMain.handle('rescan', () => rescan());
ipcMain.on('reveal', (_e, p) => {
  if (typeof p !== 'string' || !p.startsWith(importer.ROOT)) return;
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) shell.openPath(p); else shell.showItemInFolder(p);
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1180, height: 860, minWidth: 420, minHeight: 500, show: false,
    title: 'VR Closet', backgroundColor: '#ece7f7', autoHideMenuBar: true,
    icon: path.join(__dirname, 'closet.ico'),
    webPreferences: { preload: path.join(__dirname, 'preload.js') }
  });
  win.once('ready-to-show', () => win.show());   // appear with the closet already drawn, not a blank window
  win.removeMenu();
  win.loadFile('index.html');
  // Links open in the normal browser, never inside the closet
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => {
    const w = BrowserWindow.getAllWindows()[0];
    if (w) { if (w.isMinimized()) w.restore(); w.focus(); }
  });
  app.whenReady().then(createWindow);
}
app.on('window-all-closed', () => app.quit());
