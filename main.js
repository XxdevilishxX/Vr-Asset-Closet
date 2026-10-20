const { app, BrowserWindow, dialog, ipcMain, nativeImage, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const importer = require('./importer');

app.setName('VR Closet');
// Each person's closet lives in their own %APPDATA%\VR Closet, never in this app folder,
// so a fresh download starts empty. (VR_CLOSET_DATA points it elsewhere, for testing.)
if (process.env.VR_CLOSET_DATA) app.setPath('userData', process.env.VR_CLOSET_DATA);
const DATA = app.getPath('userData');
const FILE = path.join(DATA, 'closet.json');
const IMAGES = path.join(DATA, 'images');
const ORDER = ['Avatars', 'Bases', 'Tops', 'Bottoms', 'Dresses', 'Sets', 'Shoes', 'Hair',
  'Accessories', 'Flow Toys', 'Skins & Textures', 'Decals', 'Unsorted'];
const START_RAILS = ['Avatars', 'Tops', 'Bottoms', 'Dresses', 'Shoes', 'Hair', 'Accessories'];
// Closets made before the avatar folder became a setting were all scanned from here
const FIRST_FOLDER = 'D:\\Avatar Creations';

fs.mkdirSync(IMAGES, { recursive: true });
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

function load() {
  let S;
  try { S = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { return null; }
  if (S && S.imported && S.imported.length && !S.root) S.root = FIRST_FOLDER;
  return S;
}
function insideRoot(p, root) {
  const rel = root ? path.relative(root, p) : '';
  return rel && !rel.startsWith('..') && !path.isAbsolute(rel) ? rel : null;
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

// Adds everything in your avatar folder that isn't in the closet yet (deleted items stay deleted).
// The first time (or when `pick` is set) it asks which folder that is, and remembers it.
async function rescan(win, pick) {
  const S = load() || { items: [], cats: START_RAILS.slice(), outfits: [] };
  if (pick || !S.root || !fs.existsSync(S.root)) {
    const r = await dialog.showOpenDialog(win, {
      title: 'Where do you keep your avatars and clothes?', buttonLabel: 'Use this folder',
      defaultPath: S.root && fs.existsSync(S.root) ? S.root : app.getPath('documents'), properties: ['openDirectory']
    });
    if (r.canceled || !r.filePaths.length) return { cancelled: true };
    S.root = r.filePaths[0];
  }
  S.imported = S.imported || [];
  S.outfits = S.outfits || [];
  const done = new Set(S.imported);
  let added = 0;
  for (const it of importer.scan(S.root)) {
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
ipcMain.handle('rescan', (e, pick) => rescan(BrowserWindow.fromWebContents(e.sender), !!pick));
// Opens an item's location in Explorer; false when that folder or file isn't there any more
ipcMain.handle('reveal', (_e, p) => {
  if (typeof p !== 'string' || !path.isAbsolute(p) || !fs.existsSync(p)) return false;
  if (fs.statSync(p).isDirectory()) shell.openPath(p); else shell.showItemInFolder(p);
  return true;
});
// Lets you pick where an item lives now. Returns { path, key } or null if cancelled; `key` is the
// folder's path inside your avatar folder, so "Update" knows it's this item and doesn't add it again.
ipcMain.handle('pick-location', async (e, current) => {
  const root = (load() || {}).root;
  let start = root && fs.existsSync(root) ? root : app.getPath('documents');
  if (typeof current === 'string' && fs.existsSync(current)) start = fs.statSync(current).isDirectory() ? current : path.dirname(current);
  const r = await dialog.showOpenDialog(BrowserWindow.fromWebContents(e.sender), {
    title: 'Where is this item now?', buttonLabel: 'Use this folder', defaultPath: start, properties: ['openDirectory']
  });
  if (r.canceled || !r.filePaths.length) return null;
  return { path: r.filePaths[0], key: insideRoot(r.filePaths[0], root) };
});

// Invite: writes a single HTML file of the closet that opens read-only in any browser. Photos are
// embedded; folder locations and import history are left out, since they're about this PC only.
const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp' };
ipcMain.handle('make-invite', async (e, look) => {
  const S = load() || { items: [], cats: START_RAILS.slice(), outfits: [] };
  const title = (S.profile && S.profile.title) || 'My VR closet';
  const test = process.env.VR_CLOSET_INVITE_PATH;   // for testing: save here without asking
  const r = test ? { filePath: test } : await dialog.showSaveDialog(BrowserWindow.fromWebContents(e.sender), {
    title: 'Save your invite', buttonLabel: 'Save invite',
    defaultPath: path.join(app.getPath('downloads'), title.replace(/[\\/:*?"<>|]+/g, '').trim() + '.html'),
    filters: [{ name: 'Web page', extensions: ['html'] }]
  });
  if (r.canceled || !r.filePath) return null;
  const pic = name => {
    try { return `data:${MIME[path.extname(name).toLowerCase()] || 'image/jpeg'};base64,` + fs.readFileSync(path.join(IMAGES, name)).toString('base64'); }
    catch { return ''; }
  };
  const shared = {
    cats: S.cats, outfits: S.outfits || [], profile: S.profile || {}, look: look || {},
    items: S.items.map(i => ({ id: i.id, name: i.name, cat: i.cat, note: i.note || '', img: i.img && !/^data:/.test(i.img) ? pic(i.img) : (i.img || '') }))
  };
  const stub = '<script>var SHARED=' + JSON.stringify(shared).replace(/</g, '\\u003c') + ';\n' +
    'window.closet={viewOnly:true,load:function(){return{state:SHARED,imgBase:""}},save:function(){return true},' +
    'saveImage:function(){return""},rescan:function(){return Promise.resolve({cancelled:true})},' +
    'reveal:function(){return Promise.resolve(false)},pickLocation:function(){return Promise.resolve(null)},' +
    'makeInvite:function(){return Promise.resolve(null)}};</script>\n';
  const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8'), at = html.search(/<script>\r?\n\(function\(\)\{/);
  if (at < 0) throw new Error('index.html changed: cannot find the closet script');
  const page = html.slice(0, at) + stub + html.slice(at);
  fs.writeFileSync(r.filePath, page);
  if (!test) shell.showItemInFolder(r.filePath);
  return { path: r.filePath, mb: (Buffer.byteLength(page) / 1048576).toFixed(1) };
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
