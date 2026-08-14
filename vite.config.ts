import vinext from "vinext";
import { defineConfig } from "vite";

// This repository produces a static GitHub Pages build. The deployed site has
// no database, server actions, or Cloudflare bindings.
export default defineConfig({
  plugins: [vinext()],
});
