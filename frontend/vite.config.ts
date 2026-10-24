import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const apiProxy = { "/api": "http://127.0.0.1:8080" };

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: apiProxy
  },
  preview: {
    host: "127.0.0.1",
    port: 8084,
    strictPort: true,
    proxy: apiProxy
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.indexOf("node_modules/react") >= 0 || id.indexOf("node_modules/react-dom") >= 0 || id.indexOf("node_modules/react-router-dom") >= 0) {
            return "vendor-react";
          }

          if (id.indexOf("node_modules/three") >= 0 || id.indexOf("node_modules/@react-three/fiber") >= 0) {
            return "vendor-three";
          }

        }
      }
    }
  }
});
