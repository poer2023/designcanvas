export interface DesktopProjectSummary {
  id: string;
  name: string;
  description?: string | null;
  coverImage?: string | null;
  updatedAt?: string;
}

export interface DesktopGraphSnapshot {
  nodes: unknown[];
  edges: unknown[];
  viewport?: {
    x: number;
    y: number;
    zoom: number;
  };
  version?: number;
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

export interface DesktopBridge {
  platform: 'browser' | 'electron';
  listProjects(): Promise<DesktopProjectSummary[]>;
  loadGraph(projectId: string): Promise<DesktopGraphSnapshot | null>;
  saveGraph(projectId: string, graph: DesktopGraphSnapshot): Promise<void>;
  importAssets(projectId: string): Promise<DesktopAssetImportResult[]>;
  runGraph(request: DesktopRunRequest): Promise<DesktopRunResult>;
}

declare global {
  interface Window {
    posterLabDesktop?: DesktopBridge;
  }
}

