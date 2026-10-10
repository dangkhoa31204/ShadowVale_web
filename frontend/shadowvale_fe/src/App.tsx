import { PreferencesProvider } from './features/preferences/PreferencesProvider';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider, ToastContainer } from './components/ui/Toast';
import { AppRoutes } from './routes';
import './internal.css';
import './original-theme.css';
import './features/gameDelivery/gameDelivery.css';
import './template/tailadmin/tailadmin-theme.css';
import './features/content/editor.css';

import './military-theme.css';
export function App() {
  return (
    <PreferencesProvider><AuthProvider>
      <ToastProvider>
        <AppRoutes />
        <ToastContainer />
      </ToastProvider>
    </AuthProvider></PreferencesProvider>
  );
}

export default App;

