const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const path = require('node:path');

const DEFAULT_RENDERER_URL = 'http://127.0.0.1:3000';
const rendererUrl = process.env.DESIGNCANVAS_RENDERER_URL || DEFAULT_RENDERER_URL;

let mainWindow = null;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1100,
    minHeight: 720,
    title: 'DesignCanvas',
    backgroundColor: '#101014',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.loadURL(rendererUrl);

  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
}

async function fetchRendererJson(pathname, init) {
  const url = new URL(pathname, rendererUrl);
  const response = await fetch(url, init);
  const payload = await response.json();

  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || `Renderer request failed: ${response.status}`);
  }

  return payload.data;
}

function registerIpc() {
  ipcMain.handle('app:getInfo', () => ({
    name: app.getName(),
    version: app.getVersion(),
    isPackaged: app.isPackaged,
    rendererUrl,
    platform: process.platform,
  }));

  ipcMain.handle('projects:list', async () => {
    return fetchRendererJson('/api/projects');
  });

  ipcMain.handle('graphs:load', async (_event, projectId) => {
    return fetchRendererJson(`/api/projects/${projectId}/graph`);
  });

  ipcMain.handle('graphs:save', async (_event, projectId, graph) => {
    await fetchRendererJson(`/api/projects/${projectId}/graph`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        graph_snapshot: { nodes: graph.nodes, edges: graph.edges },
        viewport: graph.viewport,
      }),
    });
  });

  ipcMain.handle('assets:import', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Import assets',
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });

    if (result.canceled) return [];

    return result.filePaths.map((filePath) => ({
      assetId: filePath,
      name: path.basename(filePath),
      path: filePath,
    }));
  });

  ipcMain.handle('runs:start', async () => ({
    recipeId: null,
    status: 'error',
    error: 'Desktop run execution is not migrated yet. Use renderer runner for now.',
  }));
}

app.whenReady().then(() => {
  registerIpc();
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

