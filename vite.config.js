import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    chunkSizeWarningLimit: 1024,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("/src/data/")) {
            if (
              id.includes("naturalEarth") ||
              id.includes("regionalHighlightAreas")
            ) {
              return "geo-data";
            }
            return "app-data";
          }
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("leaflet") || id.includes("react-leaflet")) {
            return "map-vendor";
          }
          if (id.includes("react")) {
            return "react-vendor";
          }
          return "vendor";
        },
      },
    },
  },
  plugins: [react()],
});
