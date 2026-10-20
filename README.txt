VR CLOSET - your VRChat avatars, outfits and accessories, hung up on clothing rails

GETTING IT (first time on a PC)
  1. Install Node.js (LTS) from https://nodejs.org
  2. Download this project, open its folder, click the address bar, type "cmd", press Enter.
  3. Run:  npm install
  4. Run:  npm start
  If "npm start" says Electron failed to install (newer npm blocks install scripts), run
  npm install-scripts approve electron  then  npm rebuild electron

YOUR CLOSET STARTS EMPTY
  Everyone gets their own closet. It's saved on your PC only, never in this folder, so
  downloading the app never brings anyone else's things with it.
  Click "Update" and pick the folder where you keep your avatars and clothes. Every avatar,
  outfit and accessory in it is hung on a rail, with a photo when it came with a preview.
  Or click "Add item" to hang things up one at a time.

USING IT
  Click an item to change its photo (drop a VRChat screenshot on it), name, rail or notes.
  "Open in folder" goes to where it lives on your PC; "Change location" points it somewhere new.
  "Edit rails" lets you drag clothes along or between rails, and rename, reorder or delete rails.
  "Add rail" makes a new rail. "Style" changes the colors and background.
  "Profile" sets your closet's name, your name, and which avatar folder Update checks.

ADDING NEW STUFF
  Download new things into your avatar folder as usual, then click "Update".
  Only new things get added. Anything you deleted from the closet stays deleted, and your
  photos, names and notes are never touched.

INVITING PEOPLE
  "Invite" publishes a view-only copy of your closet to GitHub Pages and copies its link, e.g.
  https://your-name.github.io/your-repo/ . Anyone with the link can open it in a web browser,
  no app needed: they can look at every rail and open items, but can't change anything.
  Your folder locations aren't in it. It goes on the repository's "gh-pages" branch, so the
  app's code (what people download) never includes your closet.
  You need Git installed and a GitHub repository you own. The first time, turn on Pages once:
  repository Settings -> Pages -> Source "Deploy from a branch" -> branch "gh-pages" -> Save.
  After changing your closet, click Invite -> "Update invite link" to refresh the page.

WHERE YOUR CLOSET IS SAVED
  %APPDATA%\VR Closet\closet.json   (items, rails, outfits, favorites, profile)
  %APPDATA%\VR Closet\images\       (the photos, shrunk to 480 px)
  Back up that folder to keep your closet. Nothing in your avatar folder is ever changed.

FILES
  index.html    the closet itself (also the page an Invite file is made from)
  importer.js   scans your avatar folder: which folder is which rail, photos, nicer names.
                Dev's own folder layout has hand-tuned rules; any other folder gets a general scan
  main.js       the desktop window, saving, photo thumbnails, Update, Invite
  preload.js    the bridge between the page and main.js
  closet.ico    the icon (made by scripts/make-icon.js)
  scripts/trim-electron.js  runs after "npm install": removes ~40 MB of unused language files
