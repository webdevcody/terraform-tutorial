import { defineConfig } from "vite";

export default defineConfig({
  root: "src",
  publicDir: "../public",
  server: {
    open: true,
  },
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    copyPublicDir: true,
    rollupOptions: {
      input: "src/index.html",
      output: {
        entryFileNames: "index.js",
        format: "iife", // IIFE for <script> tag usage
        name: "App",
      },
    },
  },
});
