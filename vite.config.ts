import { defineConfig } from "vite";

export default defineConfig({
  base: "/l2d-viewer",
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          minSize: 20000,
          groups: [
            {
              name: 'vendor',
              test: /node_modules/,
            },
            {
              name: 'pixijs',
              test: /node_modules[\\/]pixi\.js/,
              priority: 5,
            },
          ],
        },
      }
    }
  }
});