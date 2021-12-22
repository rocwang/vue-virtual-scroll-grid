import { ConfigEnv, UserConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { homedir } from "os";
import { existsSync, readFileSync } from "fs";
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
    build:
      mode === "demo"
        ? {}
        : {
            lib: {
              entry: resolve(__dirname, "src/index.ts"),
              name: "VirtualScrollGrid",
              fileName: (format) => `index.${format}.js`,
            },
            rollupOptions: {
              // Make sure to externalize deps that shouldn't be bundled
              // into your library
              external: ["vue"],
              output: {
                // Provide global variables to use in the UMD build
                // for externalized deps
                globals: {
                  vue: "Vue",
                },
                // Since we publish our ./src folder, there's no point
                // in bloating sourcemaps with another copy of it.
                sourcemapExcludeSources: true,
              },
            },
            sourcemap: true,
            // Reduce bloat from legacy polyfills.
            target: "esnext",
            // Leave minification up to applications.
            minify: false,
          },
  };
};
