import { defineConfig } from "vite";

export default defineConfig({
  root: "src",
  publicDir: "../public",
  server: {
    open: true,
  },
  build: {
    outDir: "../public",
    emptyOutDir: true,
    rollupOptions: {
      input: "src/index.js",
      output: {
        entryFileNames: "index.js",
        format: "iife", // IIFE for <script> tag usage
        name: "App",
      },
    },
  },
});
