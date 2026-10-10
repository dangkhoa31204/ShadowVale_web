import axios from 'axios';
export interface Problem { code?: string; message?: string; detail?: string; title?: string; traceId?: string; errors?: Record<string, string[]> }
export function problemOf(error: unknown): Problem {
  if (error instanceof Error && error.cause) return problemOf(error.cause);
  return axios.isAxiosError<Problem>(error) && typeof error.response?.data === 'object' ? error.response.data : {};
}
export function errorMessage(error: unknown): string {
  // Preserve partial-save context wrapped around the original HTTP error.
  if (error instanceof Error && error.cause) return error.message;
  const p = problemOf(error);
  const fields = Object.entries(p.errors || {}).map(([field, messages]) => `${field}: ${messages.join(' ')}`).join('\n');
  return [p.message || p.detail || p.title || (error instanceof Error ? error.message : 'Request failed.'), fields].filter(Boolean).join('\n');
}
export function fieldError(error: unknown, name: string): string {
  return Object.entries(problemOf(error).errors || {}).filter(([key]) => key.toLowerCase() === name.toLowerCase()).flatMap(([, messages]) => messages).join(' ');
}
export function statusOf(error: unknown): number | undefined { return axios.isAxiosError(error) ? error.response?.status : undefined; }
