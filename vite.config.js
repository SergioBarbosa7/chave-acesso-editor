import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  base: "/chave-acesso-editor/",
  plugins: [vue()],
  test: {
    environment: "node"
  }
});
