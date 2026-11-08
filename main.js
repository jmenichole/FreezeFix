/*
 * ADHD Flow Widget — Electron Main Process
 * Copyright © 2026 jmenichole (J Chapman). All rights reserved.
 * Author: jmenichole <j.chapman7@yahoo.com>
 * GitHub: https://github.com/jmenichole
 * 
 * Unauthorized copying, distribution, or modification of this software is prohibited.
 * This software is proprietary and confidential.
 */

/* main.js — Electron main process desktop wrapper */
const { app, Tray, Menu, BrowserWindow, ipcMain, dialog, nativeImage, globalShortcut } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');

let mainWindow;
let tray = null;
let pythonProcess = null;
let isAlwaysOnTop = false;

// Shared secret so only this app (not arbitrary websites) can reach the local
// tracker sidecar. Generated once and exposed to the renderer via process.env
// (inherited by the renderer under nodeIntegration) and to tracker.py via its env.
const TRACKER_TOKEN = crypto.randomBytes(24).toString('hex');
process.env.FREEZEFIX_TRACKER_TOKEN = TRACKER_TOKEN;

function createTrayIcon() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
    <rect width="32" height="32" rx="8" fill="#8b5cf6" />
    <path d="M10 9h12v14H10z" fill="rgba(255,255,255,0.12)" />
    <path d="M12 13h8v2h-8zM12 17h8v2h-8zM12 21h5v2h-5z" fill="#fff" />
  </svg>`;
  const icon = nativeImage.createFromDataURL(`data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`);
  return icon.resize({ width: 16, height: 16 });
}

function updateTrayMenu() {
  if (!tray) return;
  const template = [
    {
      label: mainWindow && mainWindow.isVisible() ? 'Hide FreezeFix' : 'Show FreezeFix',
      click: () => toggleWindowVisibility()
    },
    {
      label: isAlwaysOnTop ? 'Disable Always on Top' : 'Enable Always on Top',
      click: () => toggleAlwaysOnTop()
    },
    { type: 'separator' },
    { label: 'Quit FreezeFix', role: 'quit' }
  ];
  tray.setContextMenu(Menu.buildFromTemplate(template));
}

function createTray() {
  tray = new Tray(createTrayIcon());
  tray.setToolTip('FreezeFix — Ctrl+Alt+F to toggle visibility');
  tray.on('click', () => toggleWindowVisibility());
  tray.on('double-click', () => toggleWindowVisibility());
  updateTrayMenu();
}

function toggleWindowVisibility() {
  if (!mainWindow) return;
  if (mainWindow.isVisible()) {
    mainWindow.hide();
  } else {
    mainWindow.show();
    mainWindow.focus();
  }
  updateTrayMenu();
}

function toggleAlwaysOnTop() {
  if (!mainWindow) return;
  isAlwaysOnTop = !isAlwaysOnTop;
  mainWindow.setAlwaysOnTop(isAlwaysOnTop);
  updateTrayMenu();
}

function registerGlobalShortcut() {
  const shortcut = 'Control+Alt+F';
  if (globalShortcut.isRegistered(shortcut)) return;
  globalShortcut.register(shortcut, () => {
    toggleWindowVisibility();
    if (mainWindow && mainWindow.isVisible()) {
      mainWindow.webContents.send('show-toast', 'FreezeFix restored (Ctrl+Alt+F)');
    }
  });
}

function unregisterGlobalShortcut() {
  globalShortcut.unregisterAll();
}

function startPythonTracker() {
  try {
    const trackerPath = path.join(__dirname, 'tracker.py');
    // Try common python executables: environment override, then python, then python3
    const bins = [process.env.PYTHON, 'python', 'python3'].filter(Boolean);
    let proc = null;
    const trackerEnv = Object.assign({}, process.env, { FREEZEFIX_TRACKER_TOKEN: TRACKER_TOKEN });
    for (const bin of bins) {
      try {
        proc = spawn(bin, [trackerPath], { env: trackerEnv });
        proc.stdout.on('data', (data) => { console.log(`[Tracker ${bin}]: ${data}`); });
        proc.stderr.on('data', (data) => { console.error(`[Tracker ${bin} Error]: ${data}`); });
        // If spawn succeeded, keep reference and break
        pythonProcess = proc;
        console.log('Started tracker with', bin);
        break;
      } catch (e) {
        console.warn('Failed starting tracker with', bin, e);
        continue;
      }
    }
    if (!pythonProcess) console.warn('Could not start tracker: no python executable found');
  } catch (err) {
    console.error('Failed to auto-start python tracker:', err);
  }
}

function createWindow() {
  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  const widgetWidth = Math.floor(width * 0.45); // Takes right 45% of screen

  mainWindow = new BrowserWindow({
    x: width - widgetWidth,
    y: 0,
    width: widgetWidth,
    height: height,
    frame: false,
    transparent: true,
    skipTaskbar: false,
    type: 'desktop',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Keep pinned behind other normal windows (desktop level)
  mainWindow.setAlwaysOnTop(false);

  mainWindow.loadFile('index.html');
  mainWindow.setMenu(null);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC handlers for window visibility control (renderer will try these when available)
ipcMain.on('hide-window', (evt) => {
  try { if (mainWindow) { mainWindow.hide(); updateTrayMenu(); } } catch (e) { console.error('Failed to hide window:', e); }
});
ipcMain.on('show-window', (evt) => {
  try { if (mainWindow) { mainWindow.show(); mainWindow.focus(); updateTrayMenu(); } } catch (e) { console.error('Failed to show window:', e); }
});

function setupAutoUpdater() {
  if (!app.isPackaged) {
    console.log('Skipping auto-updater in development mode.');
    return;
  }

  try {
    autoUpdater.autoDownload = true; // download in background
    autoUpdater.on('checking-for-update', () => console.log('Checking for updates...'));
    autoUpdater.on('update-available', info => {
      console.log('Update available:', info.version);
      if (mainWindow) mainWindow.webContents.send('update-available', info);
    });
    autoUpdater.on('download-progress', progress => {
      console.log('Download progress', progress);
      if (mainWindow) mainWindow.webContents.send('download-progress', progress);
    });
    autoUpdater.on('update-downloaded', info => {
      console.log('Update downloaded:', info.version);
      const choice = dialog.showMessageBoxSync({
        type: 'info',
        buttons: ['Restart and install', 'Later'],
        defaultId: 0,
        cancelId: 1,
        title: 'Update ready',
        message: 'FreezeFix has downloaded an update. Restart now to install?'
      });
      if (choice === 0) {
        try { autoUpdater.quitAndInstall(); } catch (e) { console.error('Failed to quit and install:', e); }
      }
    });
    autoUpdater.on('error', err => console.error('Auto-updater error:', err));

    autoUpdater.checkForUpdates().catch(err => console.warn('Auto-update check failed:', err));
  } catch (err) {
    console.error('Auto-updater setup failed:', err);
  }
}

app.on('ready', () => {
  createWindow();
  createTray();
  registerGlobalShortcut();
  startPythonTracker();
  setupAutoUpdater();
});

app.on('window-all-closed', () => {
  if (pythonProcess) pythonProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  if (pythonProcess) pythonProcess.kill();
  unregisterGlobalShortcut();
  if (tray) tray.destroy();
});
