const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

// Start the Express backend
require('./server/index.js');

let mainWindow;

function createWindow() {
  const windowStateFile = path.join(app.getPath('userData'), 'window-state.json');
  let windowState = {};

  try {
    if (fs.existsSync(windowStateFile)) {
      windowState = JSON.parse(fs.readFileSync(windowStateFile, 'utf8'));
    }
  } catch (err) {
    console.error('Error loading window state:', err);
  }

  const { width = 1200, height = 800, x, y } = windowState;

  mainWindow = new BrowserWindow({
    width,
    height,
    x,
    y,
    title: 'SC Manager',
    icon: path.join(__dirname, 'client/public/favicon.svg'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
    autoHideMenuBar: true, // Hides the default Electron menu bar
  });

  const saveBounds = () => {
    try {
      const bounds = mainWindow.getBounds();
      fs.writeFileSync(windowStateFile, JSON.stringify(bounds));
    } catch (err) {
      console.error('Error saving window state:', err);
    }
  };

  // Save state when window is resized or moved
  mainWindow.on('resize', saveBounds);
  mainWindow.on('move', saveBounds);
  // Optional: save on close just to be sure
  mainWindow.on('close', saveBounds);

  // The server starts on port 3001 and serves the Vite build
  mainWindow.loadURL('http://localhost:3001');

  // Open DevTools in development if needed
  // mainWindow.webContents.openDevTools();

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
