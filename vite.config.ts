import { ConfigEnv, UserConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { homedir } from "os";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

export default ({ mode }: ConfigEnv): UserConfig => {
  return {
    plugins: [vue()],
    server: {
      open: true,
      https: existsSync(`${homedir()}/.localhost_ssl/server.key`)
        ? {
            key: readFileSync(`${homedir()}/.localhost_ssl/server.key`),
            cert: readFileSync(`${homedir()}/.localhost_ssl/server.crt`),
          }
        : false,
    },
    optimizeDeps: { exclude: ["prettier"] },
    build: {
      cssCodeSplit: false,
      ...(mode === "demo"
        ? {}
        : {
            lib: {
              entry: resolve(__dirname, "src/Grid.vue"),
              name: "VirtualScrollGrid",
            },
            rollupOptions: {
              // make sure to externalize deps that shouldn't be bundled
              // into your library
              external: ["vue"],
              output: {
                // Provide global variables to use in the UMD build
                // for externalized deps
                globals: {
                  vue: "Vue",
                },
              },
            },
          }),
    },
  };
};
