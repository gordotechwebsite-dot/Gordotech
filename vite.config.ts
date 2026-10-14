import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // React must have its own chunk: otherwise rollup folds it into
          // three-vendor (shared with @react-three) and the entry pulls the
          // whole 3D bundle on every page load.
          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules/scheduler/')
          ) {
            return 'react-vendor'
          }
          // Split Three.js and 3D libraries into their own chunk (only loaded when 3D viewer is used)
          if (id.includes('node_modules/three/') || id.includes('node_modules/@react-three/')) {
            return 'three-vendor'
          }
          // recharts, d3, lodash are only used by AdminPanel (lazy-loaded), so they bundle with it automatically
          // Split react-router into its own chunk
          if (id.includes('node_modules/react-router')) {
            return 'router'
          }
        },
      },
    },
    // Enable source maps for debugging but keep build small
    sourcemap: false,
    // Target modern browsers for smaller output
    target: 'es2020',
  },
})

