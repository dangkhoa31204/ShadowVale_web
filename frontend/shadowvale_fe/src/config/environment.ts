// Demo must be explicitly enabled. Production defaults to API mode.
export const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';
export const apiBaseURL = import.meta.env.VITE_API_BASE_URL || '/api/v1';
