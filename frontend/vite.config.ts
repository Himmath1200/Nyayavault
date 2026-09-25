import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    // Listen on all interfaces (not just localhost) so the app is reachable from a phone or
    // other device on the same network — required for QR codes on certificates to be
    // scannable from a real device rather than only the machine running the dev server.
    host: true,
  },
});
