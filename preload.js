const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('closet', {
  load: () => ipcRenderer.sendSync('load'),
  save: state => ipcRenderer.sendSync('save', state),
  saveImage: dataUrl => ipcRenderer.sendSync('save-image', dataUrl),
  rescan: pick => ipcRenderer.invoke('rescan', pick),
  reveal: p => ipcRenderer.invoke('reveal', p),
  pickLocation: current => ipcRenderer.invoke('pick-location', current),
  makeInvite: look => ipcRenderer.invoke('make-invite', look)
});
