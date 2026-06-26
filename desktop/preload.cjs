const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('posterLabDesktop', {
  platform: 'electron',

  getAppInfo: () => ipcRenderer.invoke('app:getInfo'),

  listProjects: () => ipcRenderer.invoke('projects:list'),

  loadGraph: (projectId) => ipcRenderer.invoke('graphs:load', projectId),

  saveGraph: (projectId, graph) => ipcRenderer.invoke('graphs:save', projectId, graph),

  importAssets: (projectId) => ipcRenderer.invoke('assets:import', projectId),

  runGraph: (request) => ipcRenderer.invoke('runs:start', request),
});

