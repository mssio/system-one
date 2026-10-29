import { createHttpClient } from './http';
import { createMockClient } from './mock';
import type { SystemOneRequest, SystemOneResponse } from './types';

export type EvaluateInit = {
  accessToken?: string;
  signal?: AbortSignal;
};

export type SystemOneClient = {
  evaluate(request: SystemOneRequest, init?: EvaluateInit): Promise<SystemOneResponse>;
};

export function createClientFromEnv(): SystemOneClient {
  const mode = (import.meta.env.VITE_API_MODE ?? 'mock').trim().toLowerCase();
  if (mode === 'http') {
    return createHttpClient(import.meta.env.VITE_API_BASE_URL ?? '');
  }
  return createMockClient();
}
