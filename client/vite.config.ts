import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, open: true, proxy: { "/api": "http://localhost:5000" } },
  build: { outDir: "dist", emptyOutDir: true }
});
