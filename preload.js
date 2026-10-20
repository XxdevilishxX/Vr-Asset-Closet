const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('closet', {
  load: () => ipcRenderer.sendSync('load'),
  save: state => ipcRenderer.sendSync('save', state),
  saveImage: dataUrl => ipcRenderer.sendSync('save-image', dataUrl),
  rescan: () => ipcRenderer.invoke('rescan'),
  reveal: p => ipcRenderer.send('reveal', p)
});
