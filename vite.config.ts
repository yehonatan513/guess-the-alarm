import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";


// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          // React core
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          // Firebase SDK — largest chunk
          "vendor-firebase": [
            "firebase/app",
            "firebase/auth",
            "firebase/database",
          ],
          // Radix UI primitives (shadcn/ui)
          "vendor-radix": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-tooltip",
            "@radix-ui/react-slot",
            "@radix-ui/react-label",
          ],
          // Date utilities
          "vendor-date": ["date-fns"],
        },
      },
    },
  },
});
