import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8080",
        changeOrigin: true,
      },
    },
  },
  // Ensure Tailwind/PostCSS always run for `index.css` regardless of cwd/postcss discovery.
  css: {
    postcss: {
      plugins: [tailwindcss(), autoprefixer()],
    },
  },
});
