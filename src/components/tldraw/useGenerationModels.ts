import { useEffect, useState } from 'react';

export interface ImageModel {
  model_id: string;
  display_name: string;
  capabilities: Array<'text2img' | 'img2img' | 'vision'>;
}

let generationModelsPromise: Promise<ImageModel[]> | null = null;

function loadGenerationModels() {
  if (!generationModelsPromise) {
    generationModelsPromise = fetch('/api/settings/models?enabled=true')
      .then((response) => response.json())
      .then((payload: { success?: boolean; data?: ImageModel[] }) => (
        payload.success && payload.data
          ? payload.data.filter((model) => (
            model.capabilities.includes('text2img') || model.capabilities.includes('img2img')
          ))
          : []
      ))
      .catch(() => []);
  }
  return generationModelsPromise;
}

export function useGenerationModels() {
  const [models, setModels] = useState<ImageModel[]>([]);

  useEffect(() => {
    let cancelled = false;
    void loadGenerationModels().then((nextModels) => {
      if (!cancelled) setModels(nextModels);
    });
    return () => { cancelled = true; };
  }, []);

  return models;
}
