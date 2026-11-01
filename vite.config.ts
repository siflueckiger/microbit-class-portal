import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Relative asset URLs so the built site works from the GitHub Pages sub-path
// (https://<user>.github.io/microbit-class-portal/).
export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    outDir: "dist",
  },
  server: {
    port: 5174,
  },
});
