import type {
  DesktopAssetImportResult,
  DesktopBridge,
  DesktopGraphSnapshot,
  DesktopProjectSummary,
  DesktopRunRequest,
  DesktopRunResult,
} from './types';

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload = await response.json();

  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || `Request failed: ${response.status}`);
  }

  return payload.data as T;
}

const browserBridge: DesktopBridge = {
  platform: 'browser',

  async listProjects(): Promise<DesktopProjectSummary[]> {
    return requestJson<DesktopProjectSummary[]>('/api/projects');
  },

  async loadGraph(projectId: string): Promise<DesktopGraphSnapshot | null> {
    return requestJson<DesktopGraphSnapshot | null>(`/api/projects/${projectId}/graph`);
  },

  async saveGraph(projectId: string, graph: DesktopGraphSnapshot): Promise<void> {
    await requestJson(`/api/projects/${projectId}/graph`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        graph_snapshot: { nodes: graph.nodes, edges: graph.edges },
        viewport: graph.viewport,
      }),
    });
  },

  async importAssets(_projectId: string): Promise<DesktopAssetImportResult[]> {
    return [];
  },

  async runGraph(_request: DesktopRunRequest): Promise<DesktopRunResult> {
    return {
      recipeId: null,
      status: 'error',
      error: 'Graph execution is still handled in the renderer prototype.',
    };
  },
};

export function getDesktopBridge(): DesktopBridge {
  if (typeof window !== 'undefined' && window.posterLabDesktop) {
    return window.posterLabDesktop;
  }

  return browserBridge;
}

export const desktopBridge = getDesktopBridge();
