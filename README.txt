VR CLOSET - every avatar, outfit and accessory in D:\Avatar Creations, on clothing rails

OPENING IT
  Double-click "VR Closet" on your Desktop, or search "VR Closet" in the Start menu.
  If the shortcuts ever go missing, run this folder's start command instead:  npm.cmd start

WHAT'S IN IT
  The first time it opened, it went through D:\Avatar Creations and hung up 136 items:
  Avatars, Bases, Tops, Bottoms, Dresses, Sets, Shoes, Hair, Accessories, Flow Toys,
  Skins & Textures and Decals. Zips and the folders unpacked from them count as one item.
  Your Unity projects ("Unity Avatar Files") are left out on purpose.
  Items that came with a real preview picture show it. Many others got their photo from the
  creator's store page (Gumroad, Jinxxy, Payhip, Booth); their notes say which page, and the
  "Store page" button opens it. The rest show a colored name card.
  Click any item to give it your own photo (drop a VRChat screenshot on it), rename it, move it
  to another category or add notes. "Show in folder" opens where it lives on D:.
  Everything is saved: opening the app just loads your closet, it never re-imports.

ADDING NEW STUFF
  Download new things into D:\Avatar Creations as usual, then click "Update".
  Only new things get added. Anything you deleted from the closet stays deleted, and your
  photos, names and notes are never touched. "Add item" still adds things by hand.

WHERE YOUR CLOSET IS SAVED
  %APPDATA%\VR Closet\closet.json   (items, categories, outfits, favorites)
  %APPDATA%\VR Closet\images\       (the photos, shrunk to 480 px)
  Back up that folder to keep your closet. Nothing in D:\Avatar Creations is ever changed.

FILES
  index.html    the closet itself (your original page, now saving to disk instead of the browser)
  importer.js   scans D:\Avatar Creations: which folder is which category, the hand-picked
                photos, the nicer names and the things it skips (texture packs, duplicates)
  main.js       the desktop window, saving, photo thumbnails, the "Update" button
  preload.js    the bridge between the page and main.js
  closet.ico    the icon (made by scripts/make-icon.js)
  scripts/trim-electron.js  runs after "npm install": removes ~40 MB of unused language files
