// Scans an avatar folder and turns every avatar, outfit and accessory into a closet item.
// Each item gets a photo: a hand-picked one from PHOTOS, else a preview/thumbnail found in its
// folder, else none (the app draws a name card; texture maps looked like noise as photos).
// Items already imported (by key) are never re-added, even if you deleted them.
// A folder laid out like Dev's (Avatars + Assets\Clothes, Hair...) uses the tuned rules below;
// any other folder gets the general scan in scanAny().
const fs = require('fs');
const path = require('path');

let ROOT = '';   // the folder being scanned; keys are paths relative to it
const PKG = /\.(zip|rar|7z|unitypackage|gz|fbx)$/i;
const IMG = /\.(png|jpe?g|webp|gif)$/i;
// Folders inside Unity projects/packages that never hold item photos
const SKIP_DIR = /^(library|temp|logs|obj|packages|usersettings|projectsettings|poi|thry|pumkin|gogo|fastfurshader-v5|av3creator|editor|resources|vrlabs|_poiyomishaders|!dismay custom|adjerry91\.vrcft\.templates|\.git)$/i;
const PREVIEW = /thumbnail|preview|promo|showcase|render|picsart|banner|upload picture/i;
const NOT_PREVIEW = /removebg|ShaderUI|Discord|PCS|st_banner|Final IK/i;

// Paths are relative to ROOT. Hand-picked photos, renames, categories and skips after looking
// through the folder.
const PHOTOS = {
  'Avatars\\Gadget by Soy 4 (2)': 'Avatars\\Gadget by Soy 4 (2)\\Gadget by Soy\\Assets\\MATS\\etc\\Metal\\Gadget Cover.png',
  'Assets\\Clothes\\avmbz - cropped hoodie': 'Assets\\Clothes\\jacket\\Avmbz (1).png',
  'Assets\\Clothes\\Kitty Panties by MIMI': 'Assets\\Clothes\\Kitty Panties by MIMI\\ShowcaseADS\\2.png',
  'Assets\\Clothes\\GYM GIRL SET': 'Assets\\Clothes\\GYM GIRL SET\\Icons\\Crop Tee Icon.png',
  'Assets\\Accessories\\Collar and Leash.fbx': 'Assets\\Accessories\\Leash and Collar.png',
  'Assets\\Accessories\\silly hamster keychain by anodyne.fbx': 'Assets\\Accessories\\silly hampster.png',
  'Assets\\Accessories\\CHIRP Collars Raw Files': 'Assets\\Accessories\\CHIRP Collars Raw Files\\Textures\\Designs\\TiledExamples\\defaultscreen.jpg',
  'Assets\\Rave Accessories\\wg-lanyard': 'Assets\\Rave Accessories\\wg-lanyard\\PSHQ x Offline lanyard mats\\PSHQ x Offline lanyard mats\\PSHQ x OFFLINE Lanyard.png',
  'Assets\\Eye Textures\\Look_into_the_stars_Selestia': 'Assets\\Eye Textures\\Look_into_the_stars_Selestia\\1.png'
};
// Folders whose only 'preview' isn't one (Stella's is a meme)
const NO_PHOTO = new Set(['Avatars\\STELLA']);
const NAMES = {
  'Avatars\\!! MAKOTO !!': 'Makoto',
  'Avatars\\Gadget by Soy 4 (2)': 'Gadget by Soy',
  'Avatars\\Glare (PC & QUEST)': 'Glare (PC & Quest)',
  'Avatars\\RoseByLuhv1_2 (1)': 'Rose by Luhv',
  'Avatars\\Moona By CrystalTheBaka PC and QUEST': 'Moona by CrystalTheBaka',
  'Avatars\\poppy-3-31-26': 'Poppy (3-31-26 edit)',
  'Avatars\\rynan-and-tayag': 'Rynan & Tayag by Toasty Socks',
  'Avatars\\IVBYLUHV_.zip': 'Iv by Luhv',
  'Avatars\\ParadoxV2PCFTbyToastySocks.unitypackage': 'Paradox V2 by Toasty Socks',
  'Avatars\\thenewbaby.unitypackage': 'The New Baby',
  'Avatars\\mocha  chai.unitypackage': 'Mocha & Chai',
  'Avatars\\Body Bases\\1667982092vrmodels_store_zinpia-fit_base.zip': 'Zinpia Fit Base',
  'Avatars\\Body Bases\\vrmodels_store_1723928836vrmodels_store_vrmodels_store_haziebase_v1.zip': 'Hazie Base v1',
  'Avatars\\Body Bases\\vrmodels_store_801cf4b475_vrmodels_store_demure-eyes-realistic-eye-texture-by-uni.zip': 'Demure Eyes by Uni',
  'Avatars\\Eyeslashes Add-on for Amelia Head': 'Eyelashes add-on for Amelia Head',
  'Assets\\Clothes\\avmbz - cropped hoodie': 'Cropped Hoodie by avmbz',
  'Assets\\Clothes\\BittySweaterbyssukiii': 'Bitty Sweater by ssukiii',
  'Assets\\Clothes\\Every-WearSweatSetbyssukiii': 'Every-Wear Sweat Set by ssukiii',
  'Assets\\Clothes\\FatalLoveSetBySaikura': 'Fatal Love Set by Saikura',
  'Assets\\Clothes\\Flagged Up Set_xig_WESTERN': 'Flagged Up Set (Western)',
  'Assets\\Clothes\\HayweeesStash_CropZipHoodie2024': 'Crop Zip Hoodie by Hayweee',
  'Assets\\Clothes\\HayweeesStash_WideLoadShorts2023': 'Wide Load Shorts by Hayweee',
  'Assets\\Clothes\\Hoodie_Saikura': 'Hoodie by Saikura',
  'Assets\\Clothes\\RippedJeansBySaikura': 'Ripped Jeans by Saikura',
  'Assets\\Clothes\\vrmodels_store_trashy-mom-jeans': 'Trashy Mom Jeans by Saikura',
  'Assets\\Clothes\\WBY_Distressed': 'Distressed Set by WBY',
  'Assets\\Clothes\\WBY_Y2KSet': 'Y2K Set by WBY',
  'Assets\\Clothes\\2kfit': '2K Fit',
  'Assets\\Clothes\\bra skelly': 'Skelly Bra',
  'Assets\\Clothes\\Mesh': 'Mesh Top',
  'Assets\\Clothes\\ShortsMesh': 'Mesh Shorts',
  'Assets\\Clothes\\Boyfriend_s_Shirts': "Boyfriend's Shirts (material pack)",
  'Assets\\Clothes\\Fancy Lingerie': 'Fancy Lingerie by Sio',
  'Assets\\Clothes\\Bats': 'Bats skin', 'Assets\\Clothes\\skulls': 'Skulls skin', 'Assets\\Clothes\\Witchy': 'Witchy skin',
  'Assets\\Clothes\\1660805498_vans_plaz.zip': 'Vans Plaz',
  'Assets\\Clothes\\bathing suit-20260616T161217Z-3-001.zip': 'Bathing Suit',
  'Assets\\Clothes\\Hibiscus Bikini xSnail (1).fbx': 'Hibiscus Bikini by xSnail',
  'Assets\\Clothes\\Leggings • I by Xero.zip': 'Leggings by Xero',
  'Assets\\Clothes\\Dinzees Miami Babe Fit.zip': "Dinzee's Miami Babe Fit",
  'Assets\\Clothes\\YPT Jeans low(er) poly.fbx': 'YPT Jeans (low poly)',
  'Assets\\Clothes\\CollaredBodysuitHayweee.fbx': 'Collared Bodysuit by Hayweee',
  'Assets\\Clothes\\QuarterZip F.fbx': 'Quarter Zip',
  'Assets\\Clothes\\top 2.fbx': 'Top 2',
  'Assets\\Accessories\\!HTH_F_Lanyard.unitypackage': 'HTH Lanyard',
  'Assets\\Accessories\\Dynamic Brush v2.32 by INVALID.unitypackage': 'Dynamic Brush by INVALID',
  'Assets\\Accessories\\ZekksHologramProjector1.3.unitypackage': "Zekk's Hologram Projector",
  'Assets\\Accessories\\SquishGlass_V1.unitypackage': 'Squish Glass',
  'Assets\\Accessories\\silly hamster keychain by anodyne.fbx': 'Silly Hamster Keychain by anodyne',
  'Assets\\Accessories\\stibby-the-star-cat': 'Stibby the Star Cat',
  'Assets\\Accessories\\CHIRP Collars Raw Files': 'CHIRP Collars',
  'Assets\\Accessories\\cookie makeup.png': 'Cookie Makeup',
  'Assets\\vrmodels_store_8d53dc2e9c_vrmodels_store_amora-ears-tail-by-winks.zip': 'Amora Ears & Tail by Winks',
  'Assets\\Base Models\\VRBASE E-Girl': 'VRBase E-Girl',
  'Assets\\Hair\\RikkasHair': "Rikka's Hair",
  'Assets\\Hair\\vrmodels_store_bfaa1e9bda_vrmodels_store_nessy-nh-02-by-nessy-messy-bun': 'Messy Bun NH-02 by Nessy',
  'Assets\\Hair\\vrmodels_store_c40499c300_vrmodels_store_haircap-fbx': 'Haircap',
  'Assets\\Hair\\e71d882dc1_vrmodels_store_nissas-hair': "Nissa's Hair",
  'Assets\\Hair\\13c81823cc_vrmodels_store_lileilahair.fbx': "Lileila's Hair",
  'Assets\\Hair\\1722111397vrmodels_store_vrmodels_store_laylascurlyhair.fbx': "Layla's Curly Hair",
  'Assets\\Hair\\45fa50cf59_vrmodels_store_eroticashair.fbx': "Erotica's Hair",
  'Assets\\Hair\\4ae4b495c1_vrmodels_store_jessieshair.fbx': "Jessie's Hair",
  'Assets\\Hair\\200 Wavy Textures.zip': '200 Wavy Hair Textures',
  'Assets\\Hair\\SaikuraHairTextures.zip': 'Saikura Hair Textures',
  'Assets\\Eye Textures\\Look_into_the_stars_Selestia': 'Look Into the Stars eyes by Selestia',
  'Assets\\Flow Toys\\neyftis-promise-fans': "Neyfti's Promise Fans",
  'Assets\\Flow Toys\\phawkseas-sparks': "Phawksea's Sparks",
  'Assets\\Rave Accessories\\RF Kandi.unitypackage': 'RF Kandi',
  'Assets\\Rave Accessories\\wg-lanyard': 'WG Lanyard',
  'Assets\\Tattoos\\sakura texture': 'Sakura Tattoo',
  'Assets\\Clothes\\Step Up Sweats Textures': 'Step Up Sweats',
  'Assets\\Clothes\\poppyrippedjeans.fbx': 'Poppy Ripped Jeans',
  'Assets\\Clothes\\devjersey.unitypackage': 'Dev Jersey',
  'Assets\\Clothes\\Emo panties.fbx': 'Emo Panties',
  'Assets\\Clothes\\Razor Top by Neyko-Nee - zinfitbase.fbx': 'Razor Top by Neyko-Nee',
  'Assets\\Flow Toys\\Bioluminescent silks v4.unitypackage': 'Bioluminescent Silks v4',
  'Assets\\Accessories\\angel-wings': 'Angel Wings',
  'Assets\\Accessories\\functional-heart-collar': 'Functional Heart Collar',
  'Assets\\Accessories\\star-particle-trail': 'Star Particle Trail',
  'Assets\\Accessories\\star-shooter-20260618T201636Z-3-001': 'Star Shooter',
  'Avatars\\onyx-by-smolmayo': 'Onyx by smolmayo',
  'Avatars\\PebbleByKhihani.unitypackage': 'Pebble by Khihani',
  'Assets\\Clothes\\Festival outfit alien': 'Festival Outfit (Alien)',
  'Assets\\Clothes\\y2k outfit': 'Y2K Outfit'
};
const CATS = {
  'Assets\\Clothes\\Bats': 'Skins & Textures', 'Assets\\Clothes\\skulls': 'Skins & Textures', 'Assets\\Clothes\\Witchy': 'Skins & Textures',
  'Assets\\Clothes\\Kaijuu\'s Vinyl Harness by MaMachi': 'Accessories',
  'Assets\\Clothes\\Strapped Heels': 'Shoes', 'Assets\\Clothes\\Strapped Heels.zip': 'Shoes', 'Assets\\Clothes\\1660805498_vans_plaz.zip': 'Shoes',
  'Assets\\Clothes\\Boyfriend shirt': 'Tops', 'Assets\\Clothes\\Mesh': 'Tops', 'Assets\\Clothes\\Floppy Kitty.fbx': 'Accessories',
  'Assets\\Clothes\\Comfy set.fbx': 'Sets', 'Assets\\Clothes\\Comfy Pajamas By Skeletib.zip': 'Sets',
  'Assets\\Clothes\\Togglable Hood.fbx': 'Tops', 'Assets\\Clothes\\Hood Up.fbx': 'Tops', 'Assets\\Clothes\\Hood Down New.fbx': 'Tops',
  'Assets\\Accessories\\cookie makeup.png': 'Skins & Textures'
};
// Duplicates, texture-only folders and helper files that aren't wearable items
const SKIP = new Set([
  'Avatars\\Assets', 'Avatars\\Library', 'Avatars\\Body Bases', 'Avatars\\Head Bases', 'Avatars\\Amelia Head Update_10-14-23',
  'Avatars\\YUIA (1).zip', 'Avatars\\Amelia Head Update_10-14-23.zip', 'Avatars\\ParadoxV2OPTIbyToastySocks.unitypackage', 'Avatars\\Face Textures B10_Fix.psd',
  'Assets\\My Mats Yuai.unitypackage', 'Assets\\Accessories\\Textures', 'Assets\\Accessories\\functional-heart-collar-20260618T201804Z-3-001',
  'Assets\\Accessories\\VRCFury Lighting Sliders (1).unitypackage', 'Assets\\Accessories\\collar.unitypackage',
  'Assets\\Clothes\\Textures', 'Assets\\Clothes\\Data_Maps', 'Assets\\Clothes\\Basic Colors', 'Assets\\Clothes\\jacket',
  'Assets\\Clothes\\Simple top and skirt outfit textures', 'Assets\\Clothes\\Step Up Sweats Materials',
  'Assets\\Clothes\\Step Up Sweats Materials.zip', 'Assets\\Clothes\\Step Up Sweats Textures.zip',
  'Assets\\Clothes\\Delicate Textures.zip', 'Assets\\Clothes\\Hibiscus Bikini.zip', 'Assets\\Clothes\\Strapped Heels.7z',
  'Assets\\Clothes\\Skinny Jeans Female.rar', 'Assets\\Clothes\\Hood Up.fbx', 'Assets\\Clothes\\Hood Down New.fbx',
  'Assets\\Clothes\\hockey.fbx', 'Assets\\Clothes\\DELICATE DRESS RP.fbx', 'Assets\\Clothes\\DELICATE DRESS VENUS.fbx',
  'Assets\\Clothes\\Zinpia RP Jeans.fbx', 'Assets\\Clothes\\Comfy set.fbx', 'Assets\\Decals\\Anubis_Pants.zip',
  'Assets\\Hair\\e71d882dc1_vrmodels_store_nissas-hair.rar', 'Assets\\Hair\\vrmodels_store_bfaa1e9bda_vrmodels_store_nessy-nh-02-by-nessy-messy-bun.zip',
  'Assets\\Hair\\vrmodels_store_c40499c300_vrmodels_store_haircap-fbx.zip', 'Assets\\Rave Accessories\\rf-kandy-20260616T161251Z-3-001.zip',
  'Assets\\Rave Accessories\\wg-lanyard-20260616T161306Z-3-001.zip', 'Assets\\Tattoos\\sakura texture.7z'
]);
const DISPLAY = { 'DELICATE DRESS EGIRL': 'Delicate Dress', 'Zinpia Fit Jeans': 'Zinpia Jeans', 'Sweats EGIRL': 'Sweats',
  'Hoodie_Egirl': 'Hoodie' };

function exists(p) { try { fs.accessSync(p); return true; } catch { return false; } }
function ls(dir) { try { return fs.readdirSync(dir, { withFileTypes: true }); } catch { return []; } }

// "vrmodels_store_c40499c300_vrmodels_store_haircap-fbx.zip" -> "Haircap Fbx"
function cleanName(file) {
  let n = file.replace(/\.(unitypackage\.gz|unitypackage|zip|rar|7z|fbx|gz|png)$/i, '');
  n = n.replace(/vrmodels_store_/gi, '').replace(/^[0-9a-f]{10}_/i, '').replace(/^\d{9,}/, '')
    .replace(/-\d{8}T\d{6}Z-\d+-\d+$/, '').replace(/\s*\(\d+\)$/, '').replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (DISPLAY[n]) return DISPLAY[n];
  if (n === n.toLowerCase() || n === n.toUpperCase()) n = n.toLowerCase().replace(/(^|[\s-])\S/g, c => c.toUpperCase());
  return n;
}
const norm = s => cleanName(s).toLowerCase().replace(/[^a-z0-9]/g, '');

function clothesCat(n) {
  const s = n.toLowerCase();
  if (/heel|shoe|boot|sneaker|vans/.test(s)) return 'Shoes';
  if (/dress/.test(s)) return 'Dresses';
  if (/set|outfit|pj|pajama|lingerie|bikini|bathing|y2k|rave|tactical|bodysuit|distressed/.test(s)) return 'Sets';
  if (/pant|jean|short|skirt|sweats|legging|panties/.test(s)) return 'Bottoms';
  if (/fit\b/.test(s)) return 'Sets';
  if (/harness|collar|kitty/.test(s)) return 'Accessories';
  return 'Tops';
}

// Best picture inside a folder: the first image named like a preview.
function findPhoto(dir) {
  let best = null;
  (function walk(d, depth) {
    if (depth > 8 || best) return;
    for (const e of ls(d)) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { if (!SKIP_DIR.test(e.name)) walk(p, depth + 1); continue; }
      if (!IMG.test(e.name) || NOT_PREVIEW.test(e.name)) continue;
      if (PREVIEW.test(e.name) || /showcase/i.test(path.basename(d))) { best = p; return; }
    }
  })(dir, 0);
  return best;
}

// Lists every item in `root`: { key, name, cat, src, photo }
function scan(root) {
  ROOT = root;
  if (!exists(path.join(root, 'Avatars')) || !exists(path.join(root, 'Assets'))) return scanAny();
  const out = [], seen = new Set();
  function add(key, cat, isDir) {
    if (SKIP.has(key)) return;
    const src = path.join(ROOT, key), base = path.basename(key);
    const name = NAMES[key] || cleanName(base);
    const ids = [norm(name), norm(base)];   // a zip and its unpacked folder are one item
    if (ids.some(i => seen.has(i))) return;
    ids.forEach(i => seen.add(i));
    let photo = PHOTOS[key] ? path.join(ROOT, PHOTOS[key]) : null;
    if (photo && !exists(photo)) photo = null;
    if (!photo && isDir && !NO_PHOTO.has(key)) photo = findPhoto(src);
    if (!photo && !isDir && /\.png$/i.test(base) && !/makeup/i.test(base)) photo = src;
    out.push({ key, name, cat: CATS[key] || cat, src, photo });
  }
  function children(rel) { return ls(path.join(ROOT, rel)).sort((a, b) => b.isDirectory() - a.isDirectory()); }

  // Avatars and bases (your Unity projects in "Unity Avatar Files" are left out on purpose)
  for (const e of children('Avatars')) {
    const k = 'Avatars\\' + e.name;
    if (e.isDirectory() || PKG.test(e.name)) add(k, 'Avatars', e.isDirectory());
  }
  for (const e of children('Avatars\\Body Bases')) add('Avatars\\Body Bases\\' + e.name, /eye/i.test(e.name) ? 'Skins & Textures' : 'Bases', false);
  for (const e of children('Assets\\Base Models')) add('Assets\\Base Models\\' + e.name, 'Bases', e.isDirectory());

  const groups = [['Clothes', null], ['Hair', 'Hair'], ['Accessories', 'Accessories'], ['Rave Accessories', 'Accessories'],
    ['Flow Toys', 'Flow Toys'], ['Eye Textures', 'Skins & Textures'], ['Tattoos', 'Skins & Textures']];
  for (const [folder, cat] of groups) {
    for (const e of children('Assets\\' + folder)) {
      const k = 'Assets\\' + folder + '\\' + e.name;
      const ok = e.isDirectory() || PKG.test(e.name) || k === 'Assets\\Accessories\\cookie makeup.png';
      if (!ok) continue;
      const c = cat || clothesCat(NAMES[k] || e.name);
      add(k, c, e.isDirectory());
    }
  }
  add('Assets\\vrmodels_store_8d53dc2e9c_vrmodels_store_amora-ears-tail-by-winks.zip', 'Accessories', false);
  let d = 0;
  for (const e of children('Assets\\Decals')) if (/\.png$/i.test(e.name)) { NAMES['Assets\\Decals\\' + e.name] = 'Decal ' + ++d; add('Assets\\Decals\\' + e.name, 'Decals', false); }
  return out;
}

// Rail for a name: 'Clothes' means "sort it into Tops/Bottoms/..." by its own name
function guessCat(n) {
  const s = n.toLowerCase();
  if (/avatar|\bavi\b|\bavis\b|model/.test(s)) return 'Avatars';
  if (/\bbase|bases\b/.test(s)) return 'Bases';
  if (/hair|ponytail|bun\b|pigtail|braid/.test(s)) return 'Hair';
  if (/cloth|outfit|wear|fits?\b|top|shirt|hoodie|sweater|jacket|pant|jean|short|skirt|dress|bikini|lingerie|sock|heel|shoe|boot/.test(s)) return 'Clothes';
  if (/accessor|prop|collar|choker|necklace|chain|earring|piercing|glasses|hat|wing|tail|ears|lanyard|kandi|bag/.test(s)) return 'Accessories';
  if (/texture|skin|tattoo|decal|makeup|eye/.test(s)) return 'Skins & Textures';
  if (/fan|poi|silk|flow|staff/.test(s)) return 'Flow Toys';
  return '';
}
// General scan for any folder: a subfolder named like a rail ("Clothes", "Hair", "Avatars"...)
// has its contents hung on that rail; everything else at the top is one item, sorted by its name.
function scanAny() {
  const out = [], seen = new Set(), SKIPTOP = /^(\.|library$|temp$|logs$|packages$|tools?$)/i;
  function add(key, cat) {
    const src = path.join(ROOT, key), base = path.basename(key), name = cleanName(base), id = norm(base);
    if (!id || seen.has(id)) return;
    seen.add(id);
    let isDir = false; try { isDir = fs.statSync(src).isDirectory(); } catch {}
    if (cat === 'Clothes') cat = clothesCat(name);
    out.push({ key, name, cat: cat || 'Unsorted', src, photo: isDir ? findPhoto(src) : null });
  }
  for (const e of ls(ROOT).sort((a, b) => b.isDirectory() - a.isDirectory())) {
    if (SKIPTOP.test(e.name) || !(e.isDirectory() || PKG.test(e.name))) continue;
    const rail = e.isDirectory() && guessCat(e.name);
    const inner = rail ? ls(path.join(ROOT, e.name)).filter(c => c.isDirectory() || PKG.test(c.name)) : [];
    if (rail && inner.length && !/[-_ ]by[-_ ]/i.test(e.name)) inner.forEach(c => add(path.join(e.name, c.name), guessCat(c.name) || rail));
    else add(e.name, rail || guessCat(e.name));
  }
  return out;
}

module.exports = { scan };

if (require.main === module) {
  const items = scan(process.argv[2] || 'D:\\Avatar Creations');
  for (const i of items) console.log(`${i.cat.padEnd(16)} ${i.name.padEnd(44)} ${i.photo ? path.relative(ROOT, i.photo) : '-'}`);
  console.log(items.length + ' items, ' + items.filter(i => i.photo).length + ' with photos');
}
