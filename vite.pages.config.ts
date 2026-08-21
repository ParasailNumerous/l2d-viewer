import { defineConfig } from "vite";

// Demo site only
export default defineConfig({
  base: "/l2d-viewer/",
  build: {
    outDir: "dist-pages",
    emptyOutDir: true,
  },
});
