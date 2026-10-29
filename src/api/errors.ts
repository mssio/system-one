export class SystemOneError extends Error {
  readonly status: number;
  readonly detail: unknown;

  constructor(message: string, status: number, detail?: unknown) {
    super(message);
    this.name = 'SystemOneError';
    this.status = status;
    this.detail = detail;
  }
}

export function messageFromDetail(detail: unknown, fallback: string): string {
  if (typeof detail === 'string' && detail.trim().length > 0) {
    return detail;
  }
  if (isRecord(detail) && typeof detail.message === 'string' && detail.message.trim().length > 0) {
    return detail.message;
  }
  if (Array.isArray(detail)) {
    const parts = detail
      .map((item) => {
        if (!isRecord(item) || typeof item.msg !== 'string') return '';
        const loc = Array.isArray(item.loc) ? item.loc.map((part) => String(part)).join('.') : '';
        return loc.length > 0 ? `${loc}: ${item.msg}` : item.msg;
      })
      .filter((part) => part.length > 0);
    if (parts.length > 0) return parts.join('; ');
  }
  return fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
