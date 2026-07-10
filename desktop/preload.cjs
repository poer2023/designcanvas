const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('posterLabDesktop', {
  platform: 'electron',
  getAppInfo: () => ipcRenderer.invoke('app:getInfo'),
  listProjects: () => ipcRenderer.invoke('projects:list'),
  getProject: (projectId) => ipcRenderer.invoke('projects:get', projectId),
  createProject: (input) => ipcRenderer.invoke('projects:create', input),
  deleteProject: (projectId) => ipcRenderer.invoke('projects:delete', projectId),
  loadGraph: (projectId) => ipcRenderer.invoke('graphs:load', projectId),
  saveGraph: (request) => ipcRenderer.invoke('graphs:save', request),
  loadCanvasDocument: (projectId) => ipcRenderer.invoke('canvas:load', projectId),
  saveCanvasDocument: (request) => ipcRenderer.invoke('canvas:save', request),
  importAssets: (projectId) => ipcRenderer.invoke('assets:import', projectId),
  runGraph: (request) => ipcRenderer.invoke('runs:start', request),
});
