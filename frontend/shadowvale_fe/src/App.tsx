import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider, ToastContainer } from './components/ui/Toast';
import { AppRoutes } from './routes';
import './internal.css';
import './original-theme.css';
import './template/tailadmin/tailadmin-theme.css';
import './features/content/editor.css';

import './military-theme.css';
export function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppRoutes />
        <ToastContainer />
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;

