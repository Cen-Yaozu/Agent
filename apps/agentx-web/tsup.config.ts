import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["server/index.ts"],
  outDir: "dist/server",
  format: ["esm"],
  platform: "node",
  target: "node20",
  bundle: true,
  splitting: false,
  sourcemap: false,
  clean: false,
  minify: false,
  noExternal: [/@deepractice-ai\/.*/], // Only bundle workspace packages
  // Everything else (node_modules) will be external
  outExtension() {
    return {
      js: ".js",
    };
  },
});
