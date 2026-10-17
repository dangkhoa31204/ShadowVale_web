import { QueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';

/** Shared client: also cleared on sign-out so one account never sees another's cached data. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 4xx answers (permissions, validation, 401 already handled by the token refresh) will not change on retry.
      retry: (failureCount, error) => !(isAxiosError(error) && error.response && error.response.status < 500) && failureCount < 2,
    },
    mutations: { retry: false },
  },
});
