'use client';

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';

const DesignCanvasWorkspace = dynamic(
  () => import('@/components/tldraw/DesignCanvasWorkspace'),
  { ssr: false }
);

export default function DesignCanvasPage() {
  const params = useParams<{ id: string }>();
  return <DesignCanvasWorkspace projectId={params.id} />;
}
