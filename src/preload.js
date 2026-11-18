const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  login: () => ipcRenderer.invoke('login'),
  logout: () => ipcRenderer.invoke('logout'),
  play: opts => ipcRenderer.invoke('play', opts),
  on: (channel, cb) => ipcRenderer.on(channel, (_e, data) => cb(data))
});
