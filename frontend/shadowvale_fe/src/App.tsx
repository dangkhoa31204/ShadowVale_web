import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { Toaster } from './components/ui/sonner';
import { ConfirmProvider } from './features/shared/confirm';
import { queryClient } from './lib/queryClient';
import { AppRoutes } from './routes';

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ConfirmProvider>
          <AppRoutes />
          <Toaster position="top-right" richColors closeButton />
        </ConfirmProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
