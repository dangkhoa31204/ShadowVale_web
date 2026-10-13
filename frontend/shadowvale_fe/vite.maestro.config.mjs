import { defineConfig, mergeConfig } from 'vite';
import base from './vite.config.ts';
import { mockApi } from './tests/maestro/mock-api.mjs';

// Test-only server: no real BE, database or hosted service is contacted.
export default mergeConfig(base, defineConfig({
  define: { 'import.meta.env.VITE_DEMO_MODE': '"false"', 'import.meta.env.VITE_API_BASE_URL': '"/api"' },
  server: { host: '127.0.0.1', port: 15174, strictPort: true },
  plugins: [{
    name: 'maestro-local-api',
    configureServer(server) { server.middlewares.use(mockApi()); },
    // Avoid screenshot-based idle detection waiting on blinking input carets.
    transformIndexHtml() { return [{ tag: 'style', children: '*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important;caret-color:transparent!important}', injectTo: 'head' }]; },
  }],
}));
