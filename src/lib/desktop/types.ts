export interface DesktopProject {
  id: string;
  name: string;
  description?: string | null;
  style_profile_id?: string | null;
  brief_id?: string | null;
  cover_image?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DesktopCreateProjectInput {
  name: string;
  description?: string;
  style_profile_id?: string;
}

export interface DesktopViewport {
  x: number;
  y: number;
  zoom: number;
}

export interface DesktopGraphDocument {
  projectId: string;
  schemaVersion: string;
  graphSnapshot: {
    nodes: unknown[];
    edges: unknown[];
  };
  viewport: DesktopViewport;
  version: number;
  updatedAt: string;
}

export interface DesktopSaveGraphRequest {
  projectId: string;
  graphSnapshot: DesktopGraphDocument['graphSnapshot'];
  viewport: DesktopViewport;
  baseVersion: number;
  force?: boolean;
}

export interface DesktopSaveResult {
  success: boolean;
  version?: number;
  conflict?: boolean;
  serverVersion?: number;
  error?: string;
}

export interface DesktopCanvasDocument {
  projectId: string;
  schemaVersion: string;
  snapshot: Record<string, unknown>;
  version: number;
  updatedAt: string;
}

export interface DesktopSaveCanvasRequest {
  projectId: string;
  schemaVersion: string;
  snapshot: Record<string, unknown>;
  baseVersion: number;
  force?: boolean;
}

export interface DesktopAssetImportResult {
  assetId: string;
  name: string;
  mimeType?: string;
  path?: string;
  url?: string;
}

export interface DesktopRunRequest {
  projectId: string;
  mode: 'RUN_NODE' | 'RUN_FROM_HERE' | 'RUN_GROUP' | 'RUN_ALL';
  startNodeId?: string;
}

export interface DesktopRunResult {
  recipeId: string | null;
  status: 'queued' | 'running' | 'success' | 'error';
  error?: string;
}

export interface DesktopAppInfo {
  name: string;
  version: string;
  isPackaged: boolean;
  rendererUrl: string;
  platform: string;
  dataPath: string;
}

export interface DesktopBridge {
  platform: 'browser' | 'electron';
  getAppInfo?(): Promise<DesktopAppInfo>;
  listProjects(): Promise<DesktopProject[]>;
  getProject(projectId: string): Promise<DesktopProject | null>;
  createProject(input: DesktopCreateProjectInput): Promise<DesktopProject>;
  deleteProject(projectId: string): Promise<boolean>;
  loadGraph(projectId: string): Promise<DesktopGraphDocument | null>;
  saveGraph(request: DesktopSaveGraphRequest): Promise<DesktopSaveResult>;
  loadCanvasDocument(projectId: string): Promise<DesktopCanvasDocument | null>;
  saveCanvasDocument(request: DesktopSaveCanvasRequest): Promise<DesktopSaveResult>;
  importAssets(projectId: string): Promise<DesktopAssetImportResult[]>;
  runGraph(request: DesktopRunRequest): Promise<DesktopRunResult>;
}

declare global {
  interface Window {
    posterLabDesktop?: DesktopBridge;
  }
}
