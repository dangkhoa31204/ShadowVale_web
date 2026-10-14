import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider, ToastContainer } from './components/ui/Toast';
import { queryClient } from './lib/queryClient';
import { AppRoutes } from './routes';

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
          <ToastContainer />
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
