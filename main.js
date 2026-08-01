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
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let pythonProcess = null;

function startPythonTracker() {
  try {
    const trackerPath = path.join(__dirname, 'tracker.py');
    // Try common python executables: environment override, then python, then python3
    const bins = [process.env.PYTHON, 'python', 'python3'].filter(Boolean);
    let proc = null;
    for (const bin of bins) {
      try {
        proc = spawn(bin, [trackerPath]);
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

function setupAutoUpdater() {
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
      // Prompt user to restart and install
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

    // Start checking
    autoUpdater.checkForUpdates().catch(err => console.warn('Auto-update check failed:', err));
  } catch (err) {
    console.error('Auto-updater setup failed:', err);
  }
}

app.on('ready', () => {
  createWindow();
  startPythonTracker();
  setupAutoUpdater();
});

app.on('window-all-closed', () => {
  if (pythonProcess) pythonProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  if (pythonProcess) pythonProcess.kill();
});
