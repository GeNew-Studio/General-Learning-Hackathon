import { defineConfig } from "vite";
import monacoEditorPlugin from "vite-plugin-monaco-editor";

export default defineConfig({
  plugins: [monacoEditorPlugin.default({})],
  server: {
    port: 5173,
    strictPort: true,
  },
});
