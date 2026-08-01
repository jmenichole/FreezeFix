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
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let pythonProcess = null;

function startPythonTracker() {
  try {
    pythonProcess = spawn('python', [path.join(__dirname, 'tracker.py')]);
    pythonProcess.stdout.on('data', (data) => {
      console.log(`[Tracker]: ${data}`);
    });
    pythonProcess.stderr.on('data', (data) => {
      console.error(`[Tracker Error]: ${data}`);
    });
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

app.on('ready', () => {
  createWindow();
  startPythonTracker();
});

app.on('window-all-closed', () => {
  if (pythonProcess) pythonProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  if (pythonProcess) pythonProcess.kill();
});
