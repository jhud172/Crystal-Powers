import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:8080"
    }
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

          if (id.indexOf("CrystalOpenerScene") >= 0) {
            return "crystal-scene";
          }
        }
      }
    }
  }
});
