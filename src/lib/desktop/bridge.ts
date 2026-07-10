import type {
  DesktopAssetImportResult,
  DesktopBridge,
  DesktopCanvasDocument,
  DesktopCreateProjectInput,
  DesktopGraphDocument,
  DesktopProject,
  DesktopRunResult,
  DesktopSaveCanvasRequest,
  DesktopSaveGraphRequest,
  DesktopSaveResult,
} from './types';

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: string;
  conflict?: boolean;
  server_version?: number;
}

async function requestEnvelope<T>(url: string, init?: RequestInit): Promise<ApiEnvelope<T>> {
  const response = await fetch(url, init);
  const payload = await response.json() as ApiEnvelope<T>;

  if (!response.ok && !payload.conflict) {
    throw new Error(payload.error || `Request failed: ${response.status}`);
  }

  return payload;
}

async function requestData<T>(url: string, init?: RequestInit): Promise<T> {
  const payload = await requestEnvelope<T>(url, init);
  if (!payload.success || payload.data === undefined) {
    throw new Error(payload.error || 'Request failed');
  }
  return payload.data;
}

const browserBridge: DesktopBridge = {
  platform: 'browser',

  listProjects(): Promise<DesktopProject[]> {
    return requestData<DesktopProject[]>('/api/projects');
  },

  getProject(projectId: string): Promise<DesktopProject | null> {
    return requestData<DesktopProject | null>(`/api/projects/${projectId}`);
  },

  createProject(input: DesktopCreateProjectInput): Promise<DesktopProject> {
    return requestData<DesktopProject>('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  },

  async deleteProject(projectId: string): Promise<boolean> {
    const result = await requestData<{ deleted: boolean }>(`/api/projects/${projectId}`, {
      method: 'DELETE',
    });
    return result.deleted;
  },

  async loadGraph(projectId: string): Promise<DesktopGraphDocument | null> {
    const result = await requestData<{
      project_id: string;
      schema_version: string;
      graph_snapshot: DesktopGraphDocument['graphSnapshot'];
      viewport: DesktopGraphDocument['viewport'];
      version: number;
      updated_at: string;
    }>(`/api/projects/${projectId}/graph`);

    return {
      projectId: result.project_id,
      schemaVersion: result.schema_version,
      graphSnapshot: result.graph_snapshot,
      viewport: result.viewport,
      version: result.version,
      updatedAt: result.updated_at,
    };
  },

  async saveGraph(request: DesktopSaveGraphRequest): Promise<DesktopSaveResult> {
    const result = await requestEnvelope<{ version: number }>(
      `/api/projects/${request.projectId}/graph`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base_version: request.baseVersion,
          graph_snapshot: request.graphSnapshot,
          viewport: request.viewport,
          force: request.force === true,
        }),
      }
    );

    return {
      success: result.success,
      version: result.data?.version,
      conflict: result.conflict,
      serverVersion: result.server_version,
      error: result.error,
    };
  },

  async loadCanvasDocument(projectId: string): Promise<DesktopCanvasDocument | null> {
    const result = await requestData<{
      project_id: string;
      schema_version: string;
      snapshot: Record<string, unknown>;
      version: number;
      updated_at: string;
    } | null>(`/api/projects/${projectId}/canvas`);

    if (!result) return null;
    return {
      projectId: result.project_id,
      schemaVersion: result.schema_version,
      snapshot: result.snapshot,
      version: result.version,
      updatedAt: result.updated_at,
    };
  },

  async saveCanvasDocument(request: DesktopSaveCanvasRequest): Promise<DesktopSaveResult> {
    const result = await requestEnvelope<{ version: number }>(
      `/api/projects/${request.projectId}/canvas`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base_version: request.baseVersion,
          schema_version: request.schemaVersion,
          snapshot: request.snapshot,
          force: request.force === true,
        }),
      }
    );

    return {
      success: result.success,
      version: result.data?.version,
      conflict: result.conflict,
      serverVersion: result.server_version,
      error: result.error,
    };
  },

  async importAssets(): Promise<DesktopAssetImportResult[]> {
    return [];
  },

  async runGraph(): Promise<DesktopRunResult> {
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
