
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // Bridges the build-time process.env reference to our runtime window shim.
    // This allows the Gemini SDK and our components to share the same dynamic environment object.
    'process.env': 'window.process.env'
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild'
  }
});
