export function isAuthBypass(): boolean {
  const mode = (import.meta.env.VITE_API_MODE ?? 'mock').trim().toLowerCase();
  const endpoint = import.meta.env.VITE_LOGTO_ENDPOINT?.trim() ?? '';
  const appId = import.meta.env.VITE_LOGTO_APP_ID?.trim() ?? '';
  return mode !== 'http' || endpoint.length === 0 || appId.length === 0;
}

export function logtoConfig(): { endpoint: string; appId: string; resources?: string[] } {
  const resource = import.meta.env.VITE_LOGTO_RESOURCE?.trim() ?? '';
  return {
    endpoint: import.meta.env.VITE_LOGTO_ENDPOINT ?? '',
    appId: import.meta.env.VITE_LOGTO_APP_ID ?? '',
    ...(resource.length > 0 ? { resources: [resource] } : {}),
  };
}

export function logtoResource(): string | undefined {
  const resource = import.meta.env.VITE_LOGTO_RESOURCE?.trim() ?? '';
  return resource.length > 0 ? resource : undefined;
}
