const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const fs = require('fs');

// Keep a global reference of the window object to prevent garbage collection
let mainWindow;

// Create the main browser window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false, // For security reasons
      contextIsolation: true, // Protect against prototype pollution
      preload: path.join(__dirname, 'preload.js'), // Use a preload script
    },
    title: 'WSI Viewer',
    icon: path.join(__dirname, '../public/favicon.ico')
  });

  // Load the app
  const startUrl = isDev
    ? 'http://localhost:3000' // Development server URL
    : `file://${path.join(__dirname, '../out/index.html')}`; // Production build path

  mainWindow.loadURL(startUrl);

  // Open the DevTools automatically in development mode
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Initialize the app when ready
app.whenReady().then(() => {
  createWindow();

  // On macOS, re-create a window when the dock icon is clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit the app when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle file opening dialog
ipcMain.handle('open-file-dialog', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'Slide Images', extensions: ['svs', 'tif', 'tiff'] }
    ]
  });
  
  if (!canceled && filePaths.length > 0) {
    return filePaths[0];
  }
  return null;
});

// Check if the backend API is running
ipcMain.handle('check-api', async (event, apiUrl) => {
  try {
    const response = await fetch(`${apiUrl}/health`);
    return response.ok;
  } catch (error) {
    console.error('API check failed:', error);
    return false;
  }
}); 