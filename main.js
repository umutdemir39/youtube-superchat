const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

// Start the Express backend
require('./server/index.js');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'SC Manager',
    icon: path.join(__dirname, 'client/public/favicon.svg'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
    autoHideMenuBar: true, // Hides the default Electron menu bar
  });

  // The server starts on port 3001 and serves the Vite build
  mainWindow.loadURL('http://localhost:3001');

  // Open DevTools in development if needed
  // mainWindow.webContents.openDevTools();

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
