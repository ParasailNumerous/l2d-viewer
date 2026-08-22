import { defineConfig } from "vite";

export default defineConfig(({ mode }) => {
  if (mode !== "production") {
    return {
      base: "/l2d-viewer",
    };
  }
  return {
    build: {
      lib: {
        name: "Live2dViewer",
        entry: "src/live2d-viewer.ts",
        formats: ["es", "iife"],
        fileName: "live2d-viewer"
      },
      outDir: "dist",
      emptyOutDir: true,
      sourcemap: true,
      target: "es2023",
      cssCodeSplit: false,
    },
  };
});
