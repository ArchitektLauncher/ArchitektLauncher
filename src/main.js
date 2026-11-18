const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const MC_VERSION = '1.21.11';
const gameDir = () => path.join(app.getPath('userData'), 'minecraft');
const accountFile = () => path.join(app.getPath('userData'), 'account.json');

let win;
let account = null;

function createWindow() {
  win = new BrowserWindow({
    width: 900,
    height: 560,
    resizable: false,
    backgroundColor: '#14161a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, 'index.html'));
}

async function lib() {
  const m = await import('minecraft-java-core');
  return m.Launch ? m : m.default;
}

const send = (ch, data) => win && !win.isDestroyed() && win.webContents.send(ch, data);

ipcMain.handle('login', async () => {
  const { Microsoft } = await lib();
  const ms = new Microsoft();
  let acc = null;

  if (fs.existsSync(accountFile())) {
    try {
      acc = JSON.parse(fs.readFileSync(accountFile(), 'utf8'));
      if (acc.refresh_token && typeof ms.refresh === 'function') acc = await ms.refresh(acc);
    } catch { acc = null; }
  }
  if (!acc || acc.error) acc = await ms.getAuth();
  if (!acc || acc.error) throw new Error(acc?.errorMessage || 'Не удалось войти');

  fs.writeFileSync(accountFile(), JSON.stringify(acc, null, 2));
  account = acc;
  return { name: acc.name };
});

ipcMain.handle('logout', async () => {
  account = null;
  if (fs.existsSync(accountFile())) fs.unlinkSync(accountFile());
});

ipcMain.handle('play', async (_e, { ramGb }) => {
  if (!account) throw new Error('Сначала войди в аккаунт');
  const { Launch } = await lib();
  const launcher = new Launch();

  launcher.on('progress', (p, s) => send('progress', { p, s }));
  launcher.on('data', d => send('log', String(d)));
  launcher.on('error', e => send('log', 'ERROR: ' + (e?.error || e?.message || JSON.stringify(e))));
  launcher.on('close', () => send('closed'));

  const opts = {
    authenticator: account,
    path: gameDir(),
    version: MC_VERSION,
    detached: false,
    downloadFileMultiple: 10,
    intelEnabledMac: false,
    loader: { type: 'fabric', build: 'latest', enable: true },
    memory: { min: '1G', max: `${ramGb || 4}G` }
  };

  await (launcher.Launch || launcher.launch).call(launcher, opts);
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
