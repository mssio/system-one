import type { SystemOneClient } from './client';
import { messageFromDetail, SystemOneError } from './errors';
import type { SystemOneResponse } from './types';

export function createHttpClient(baseUrl: string): SystemOneClient {
  return {
    async evaluate(request, init) {
      const root = baseUrl.trim().replace(/\/$/, '');
      if (root.length === 0) {
        throw new SystemOneError('VITE_API_BASE_URL is not set.', 0);
      }

      let response: Response;
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (init?.accessToken) {
          headers.Authorization = `Bearer ${init.accessToken}`;
        }
        response = await fetch(`${root}/v1/systemone`, {
          method: 'POST',
          headers,
          body: JSON.stringify(request),
          signal: init?.signal,
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') throw error;
        const message = error instanceof Error ? error.message : 'Network request failed.';
        throw new SystemOneError(message, 0);
      }

      if (!response.ok) {
        const detail = await readDetail(response);
        const fallback = response.statusText || 'Request failed.';
        throw new SystemOneError(messageFromDetail(detail, fallback), response.status, detail);
      }

      const body: unknown = await response.json();
      if (!isSystemOneResponse(body)) {
        throw new SystemOneError('The server returned an unexpected response.', response.status);
      }
      return body;
    },
  };
}

async function readDetail(response: Response): Promise<unknown> {
  try {
    const body: unknown = await response.json();
    if (typeof body === 'object' && body !== null && 'detail' in body) {
      return body.detail;
    }
    return body;
  } catch {
    return undefined;
  }
}

function isSystemOneResponse(value: unknown): value is SystemOneResponse {
  if (typeof value !== 'object' || value === null) return false;
  if (!('model' in value) || typeof value.model !== 'string') return false;
  if (!('answers' in value) || typeof value.answers !== 'object' || value.answers === null)
    return false;
  if (!('usage' in value) || typeof value.usage !== 'object' || value.usage === null) return false;
  return true;
}
