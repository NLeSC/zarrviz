import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import viteTsconfigPaths from "vite-tsconfig-paths";
import glsl from "vite-plugin-glsl";

export default defineConfig({
  // depending on your application, base can also be "/"
  base: "",
  plugins: [react(), viteTsconfigPaths(), glsl()],
  server: {
    // this ensures that the browser opens upon server start
    open: false,
    // this sets a default port to 3000
    port: 3000,
  },
  // build destination folder
  build: {
    outDir: "build",
    emptyOutDir: true,
  },
});
