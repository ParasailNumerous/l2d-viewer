import { defineConfig } from "vite";

export default defineConfig(({ mode }) => {
  if (mode !== "production") {
    return {
      base: "/l2d-viewer/",
    };
  }
  return {
    build: {
      lib: {
        entry: "src/live2d-viewer.ts",
        formats: ["es"],
        fileName: () => "live2d-viewer.js",
      },
      outDir: "dist",
      emptyOutDir: true,
      sourcemap: true,
      target: "es2023",
      cssCodeSplit: false,
    },
  };
});
