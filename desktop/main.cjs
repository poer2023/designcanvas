const { spawn } = require('node:child_process');
const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');
const crypto = require('node:crypto');
const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const { DesktopDatabase } = require('./services/database.cjs');
const { resolveSchemaFiles } = require('./services/runtime-paths.cjs');
const { requireNonEmptyString, requireSafePathSegment } = require('./services/validation.cjs');

let mainWindow = null;
let rendererProcess = null;
let rendererUrl = process.env.DESIGNCANVAS_RENDERER_URL || null;
let database = null;

app.setName('DesignCanvas');
const userDataOverride = process.env.DESIGNCANVAS_USER_DATA_DIR?.trim();
if (userDataOverride) {
  app.setPath('userData', path.resolve(userDataOverride));
} else if (!app.isPackaged) {
  app.setPath('userData', path.join(app.getPath('appData'), 'DesignCanvas'));
}

function getSchemaFiles() {
  return resolveSchemaFiles({
    isPackaged: app.isPackaged,
    resourcesPath: process.resourcesPath,
    mainDir: __dirname,
  });
}

function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : null;
      server.close(() => port ? resolve(port) : reject(new Error('Failed to reserve renderer port')));
    });
  });
}

async function waitForRenderer(url, timeoutMs = 30000) {
  const startedAt = Date.now();
  let lastError = null;
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url, { redirect: 'manual' });
      if (response.status < 500) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Renderer did not start within ${timeoutMs}ms`, { cause: lastError });
}

async function startPackagedRenderer() {
  const rendererRoot = path.join(process.resourcesPath, 'renderer');
  const serverPath = path.join(rendererRoot, 'server.js');
  if (!fs.existsSync(serverPath)) {
    throw new Error(`Packaged renderer is missing: ${serverPath}`);
  }

  const port = await findFreePort();
  const url = `http://127.0.0.1:${port}`;
  rendererProcess = spawn(process.execPath, [serverPath], {
    cwd: rendererRoot,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      HOSTNAME: '127.0.0.1',
      PORT: String(port),
      NODE_ENV: 'production',
      NEXT_TELEMETRY_DISABLED: '1',
      DESIGNCANVAS_DATA_DIR: path.join(app.getPath('userData'), 'compat'),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  rendererProcess.stdout?.on('data', (chunk) => console.log(`[renderer] ${chunk}`));
  rendererProcess.stderr?.on('data', (chunk) => console.error(`[renderer] ${chunk}`));
  await waitForRenderer(url);
  return url;
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1080,
    minHeight: 720,
    show: false,
    backgroundColor: '#f7f7f5',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.once('ready-to-show', () => mainWindow?.show());
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (new URL(url).origin !== new URL(rendererUrl).origin) {
      event.preventDefault();
      if (/^https?:/i.test(url)) shell.openExternal(url);
    }
  });

  mainWindow.loadURL(rendererUrl);
  if (!app.isPackaged && process.env.DESIGNCANVAS_OPEN_DEVTOOLS === '1') {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
}

function registerIpc() {
  ipcMain.handle('app:getInfo', () => ({
    name: app.getName(),
    version: app.getVersion(),
    isPackaged: app.isPackaged,
    rendererUrl,
    platform: process.platform,
    dataPath: app.getPath('userData'),
  }));

  ipcMain.handle('projects:list', () => database.listProjects());
  ipcMain.handle('projects:get', (_event, projectId) =>
    database.getProject(requireNonEmptyString(projectId, 'projectId'))
  );
  ipcMain.handle('projects:create', (_event, input) => {
    requireNonEmptyString(input?.name, 'name');
    return database.createProject(input);
  });
  ipcMain.handle('projects:delete', (_event, projectId) =>
    database.deleteProject(requireNonEmptyString(projectId, 'projectId'))
  );
  ipcMain.handle('graphs:load', (_event, projectId) =>
    database.loadGraph(requireNonEmptyString(projectId, 'projectId'))
  );
  ipcMain.handle('graphs:save', (_event, request) => {
    requireNonEmptyString(request?.projectId, 'projectId');
    return database.saveGraph(request);
  });
  ipcMain.handle('canvas:load', (_event, projectId) =>
    database.loadCanvasDocument(requireNonEmptyString(projectId, 'projectId'))
  );
  ipcMain.handle('canvas:save', (_event, request) => {
    requireNonEmptyString(request?.projectId, 'projectId');
    return database.saveCanvasDocument(request);
  });

  ipcMain.handle('assets:import', async (_event, projectId) => {
    const safeProjectId = requireSafePathSegment(projectId, 'projectId');
    if (!database.getProject(safeProjectId)) throw new Error('Project not found');
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Import assets',
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Media', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'mp4', 'webm'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });
    if (result.canceled) return [];

    const targetDir = path.join(database.assetsDir, 'imports', safeProjectId);
    fs.mkdirSync(targetDir, { recursive: true });
    return result.filePaths.map((sourcePath) => {
      const extension = path.extname(sourcePath).toLowerCase();
      const assetId = crypto.randomUUID();
      const targetPath = path.join(targetDir, `${assetId}${extension}`);
      fs.copyFileSync(sourcePath, targetPath);
      return { assetId, name: path.basename(sourcePath), path: targetPath };
    });
  });

  ipcMain.handle('runs:start', async () => ({
    recipeId: null,
    status: 'error',
    error: 'Desktop run execution has not moved to a worker yet.',
  }));
}

function stopBackgroundProcesses() {
  database?.close();
  database = null;
  if (rendererProcess && !rendererProcess.killed) rendererProcess.kill();
  rendererProcess = null;
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.setAppUserModelId('ai.designcanvas.desktop');
  app.on('second-instance', () => {
    if (mainWindow?.isMinimized()) mainWindow.restore();
    mainWindow?.focus();
  });

  app.whenReady().then(async () => {
    database = new DesktopDatabase({
      dataDir: app.getPath('userData'),
      schemaFiles: getSchemaFiles(),
    });
    if (!rendererUrl) {
      rendererUrl = app.isPackaged
        ? await startPackagedRenderer()
        : 'http://127.0.0.1:3000';
    }
    registerIpc();
    createMainWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
    });
  }).catch((error) => {
    console.error(error);
    dialog.showErrorBox('DesignCanvas failed to start', error.message);
    stopBackgroundProcesses();
    app.quit();
  });

  app.on('before-quit', stopBackgroundProcesses);
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
