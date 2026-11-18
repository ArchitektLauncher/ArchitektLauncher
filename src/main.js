const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

const MC_VERSION = '1.21.11';
const gameDir = () => path.join(app.getPath('userData'), 'minecraft');
const modsDir = () => path.join(gameDir(), 'mods');
const accountFile = () => path.join(app.getPath('userData'), 'account.json');
const ensureMods = () => fs.mkdirSync(modsDir(), { recursive: true });

let win;
let account = null;

function createWindow() {
  win = new BrowserWindow({
    width: 980,
    height: 640,
    resizable: false,
    title: 'ArchitektVisuals',
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

/* ---------- Аккаунт ---------- */
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

/* ---------- Моды ---------- */
ipcMain.handle('mods:list', () => {
  ensureMods();
  return fs
    .readdirSync(modsDir())
    .filter(f => f.endsWith('.jar') || f.endsWith('.jar.disabled'))
    .sort((a, b) => a.localeCompare(b))
    .map(f => ({ name: f, enabled: f.endsWith('.jar') }));
});

ipcMain.handle('mods:add', async () => {
  ensureMods();
  const r = await dialog.showOpenDialog(win, {
    title: 'Выбери моды Fabric',
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Моды (.jar)', extensions: ['jar'] }]
  });
  if (r.canceled) return 0;
  for (const f of r.filePaths) {
    fs.copyFileSync(f, path.join(modsDir(), path.basename(f)));
  }
  return r.filePaths.length;
});

ipcMain.handle('mods:toggle', (_e, name) => {
  const base = path.basename(name);
  const from = path.join(modsDir(), base);
  const to = base.endsWith('.disabled')
    ? from.slice(0, -'.disabled'.length)
    : from + '.disabled';
  fs.renameSync(from, to);
});

ipcMain.handle('mods:remove', (_e, name) => {
  fs.unlinkSync(path.join(modsDir(), path.basename(name)));
});

ipcMain.handle('mods:open', () => {
  ensureMods();
  return shell.openPath(modsDir());
});

/* ---------- Запуск ---------- */
ipcMain.handle('play', async (_e, { ramGb }) => {
  if (!account) throw new Error('Сначала войди в аккаунт');
  ensureMods();
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
