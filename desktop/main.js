const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');

// The gadget loads the deployed web app's /widget route, so it updates with
// every web deploy and needs no repackaging. Override for local dev.
const START_URL = process.env.POMPAY_WIDGET_URL || 'https://joyful-cupcake-707b98.netlify.app/widget';

// Test isolation hook: point the Chromium profile somewhere else.
if (process.env.POMPAY_USER_DATA) {
  app.setPath('userData', process.env.POMPAY_USER_DATA);
}

let win = null;

// Two instances would share one profile; the loser of the storage lock gets
// silent in-memory localStorage and drops logins/guest data on exit. Only
// ever run one — a second launch focuses the existing window instead.
const gotInstanceLock = app.requestSingleInstanceLock();
if (!gotInstanceLock) {
  app.quit();
}
app.on('second-instance', () => {
  if (win) {
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
  }
});

const createWindow = () => {
  win = new BrowserWindow({
    width: 340,
    height: 560,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    frame: false,
    backgroundColor: '#131a2a',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.setMenuBarVisibility(false);
  win.loadURL(START_URL);

  // Any external link opens in the default browser, not the gadget window.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith(START_URL.split('/widget')[0]) ) {
      e.preventDefault();
      shell.openExternal(url);
    }
  });

  win.on('closed', () => { win = null; });
};

ipcMain.on('widget:minimize', () => win?.minimize());
ipcMain.on('widget:close', () => win?.close());
ipcMain.handle('widget:togglePin', () => {
  if (!win) return false;
  const next = !win.isAlwaysOnTop();
  win.setAlwaysOnTop(next);
  return next;
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
app.on('activate', () => { if (!win) createWindow(); });
