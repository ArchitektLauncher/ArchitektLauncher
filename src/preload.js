const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  login: () => ipcRenderer.invoke('login'),
  logout: () => ipcRenderer.invoke('logout'),
  play: opts => ipcRenderer.invoke('play', opts),
  modsList: () => ipcRenderer.invoke('mods:list'),
  modsAdd: () => ipcRenderer.invoke('mods:add'),
  modsToggle: name => ipcRenderer.invoke('mods:toggle', name),
  modsRemove: name => ipcRenderer.invoke('mods:remove', name),
  modsOpen: () => ipcRenderer.invoke('mods:open'),
  on: (channel, cb) => ipcRenderer.on(channel, (_e, data) => cb(data))
});
