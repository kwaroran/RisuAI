// vite.config.ts
import { defineConfig } from "file:///C:/Users/blueb/OneDrive/Documents/VSC/_Risu/kakuna/RisuAI/node_modules/.pnpm/vite@4.4.5_@types+node@18.16.19/node_modules/vite/dist/node/index.js";
import { svelte } from "file:///C:/Users/blueb/OneDrive/Documents/VSC/_Risu/kakuna/RisuAI/node_modules/.pnpm/@sveltejs+vite-plugin-svelte@2.4.2_svelte@4.1.0_vite@4.4.5/node_modules/@sveltejs/vite-plugin-svelte/src/index.js";
import sveltePreprocess from "file:///C:/Users/blueb/OneDrive/Documents/VSC/_Risu/kakuna/RisuAI/node_modules/.pnpm/svelte-preprocess@5.0.4_postcss@8.4.26_svelte@4.1.0_typescript@5.1.6/node_modules/svelte-preprocess/dist/index.js";
import wasm from "file:///C:/Users/blueb/OneDrive/Documents/VSC/_Risu/kakuna/RisuAI/node_modules/.pnpm/vite-plugin-wasm@3.2.2_vite@4.4.5/node_modules/vite-plugin-wasm/exports/import.mjs";
import { internalIpV4 } from "file:///C:/Users/blueb/OneDrive/Documents/VSC/_Risu/kakuna/RisuAI/node_modules/.pnpm/internal-ip@7.0.0/node_modules/internal-ip/index.js";
import topLevelAwait from "file:///C:/Users/blueb/OneDrive/Documents/VSC/_Risu/kakuna/RisuAI/node_modules/.pnpm/vite-plugin-top-level-await@1.3.1_rollup@3.26.3_vite@4.4.5/node_modules/vite-plugin-top-level-await/exports/import.mjs";
var vite_config_default = defineConfig(async () => {
  const host = await internalIpV4();
  return {
    plugins: [
      svelte({
        preprocess: [
          sveltePreprocess({
            typescript: true
          })
        ],
        onwarn: (warning, handler) => {
          if (warning.code.startsWith("a11y-"))
            return;
          handler(warning);
        }
      }),
      wasm(),
      topLevelAwait()
    ],
    // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
    // prevent vite from obscuring rust errors
    clearScreen: false,
    // tauri expects a fixed port, fail if that port is not available
    server: {
      host: "0.0.0.0",
      // listen on all addresses
      port: 5174,
      strictPort: true,
      hmr: {
        protocol: "ws",
        host,
        port: 5184
      }
    },
    // to make use of `TAURI_DEBUG` and other env variables
    // https://tauri.studio/v1/api/config#buildconfig.beforedevcommand
    envPrefix: ["VITE_", "TAURI_"],
    build: {
      // Tauri supports es2021
      target: 'es2020',
      // don't minify for debug builds
      minify: process.env.TAURI_DEBUG ? false : "esbuild",
      // produce sourcemaps for debug builds
      sourcemap: !!process.env.TAURI_DEBUG,
      chunkSizeWarningLimit: 2e3
    },
    optimizeDeps: {
      needsInterop: [
        "@mlc-ai/web-tokenizers"
      ]
    },
    resolve: {
      alias: {
        "src": "/src",
        "modules": "/modules"
      }
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxibHVlYlxcXFxPbmVEcml2ZVxcXFxEb2N1bWVudHNcXFxcVlNDXFxcXF9SaXN1XFxcXGtha3VuYVxcXFxSaXN1QUlcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXGJsdWViXFxcXE9uZURyaXZlXFxcXERvY3VtZW50c1xcXFxWU0NcXFxcX1Jpc3VcXFxca2FrdW5hXFxcXFJpc3VBSVxcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvYmx1ZWIvT25lRHJpdmUvRG9jdW1lbnRzL1ZTQy9fUmlzdS9rYWt1bmEvUmlzdUFJL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSBcInZpdGVcIjtcclxuaW1wb3J0IHsgc3ZlbHRlIH0gZnJvbSBcIkBzdmVsdGVqcy92aXRlLXBsdWdpbi1zdmVsdGVcIjtcclxuaW1wb3J0IHN2ZWx0ZVByZXByb2Nlc3MgZnJvbSBcInN2ZWx0ZS1wcmVwcm9jZXNzXCI7XHJcbmltcG9ydCB3YXNtIGZyb20gXCJ2aXRlLXBsdWdpbi13YXNtXCI7XHJcbmltcG9ydCB7IGludGVybmFsSXBWNCB9IGZyb20gJ2ludGVybmFsLWlwJ1xyXG5pbXBvcnQgdG9wTGV2ZWxBd2FpdCBmcm9tIFwidml0ZS1wbHVnaW4tdG9wLWxldmVsLWF3YWl0XCI7XHJcblxyXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xyXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoYXN5bmMgKCkgPT4ge1xyXG4gIFxyXG4gIGNvbnN0IGhvc3QgPSBhd2FpdCBpbnRlcm5hbElwVjQoKVxyXG5cclxuICByZXR1cm4ge1xyXG4gICAgcGx1Z2luczogW1xyXG4gICAgICBcclxuICAgICAgc3ZlbHRlKHtcclxuICAgICAgICBwcmVwcm9jZXNzOiBbXHJcbiAgICAgICAgICBzdmVsdGVQcmVwcm9jZXNzKHtcclxuICAgICAgICAgICAgdHlwZXNjcmlwdDogdHJ1ZSxcclxuICAgICAgICAgIH0pLFxyXG4gICAgICAgIF0sXHJcbiAgICAgICAgb253YXJuOiAod2FybmluZywgaGFuZGxlcikgPT4ge1xyXG4gICAgICAgICAgLy8gZGlzYWJsZSBhMTF5IHdhcm5pbmdzXHJcbiAgICAgICAgICBpZiAod2FybmluZy5jb2RlLnN0YXJ0c1dpdGgoXCJhMTF5LVwiKSkgcmV0dXJuO1xyXG4gICAgICAgICAgaGFuZGxlcih3YXJuaW5nKTtcclxuICAgICAgICB9LFxyXG4gICAgICB9KSxcclxuICAgICAgd2FzbSgpLFxyXG4gICAgICB0b3BMZXZlbEF3YWl0KCksXHJcbiAgICBdLFxyXG5cclxuICAgIC8vIFZpdGUgb3B0aW9ucyB0YWlsb3JlZCBmb3IgVGF1cmkgZGV2ZWxvcG1lbnQgYW5kIG9ubHkgYXBwbGllZCBpbiBgdGF1cmkgZGV2YCBvciBgdGF1cmkgYnVpbGRgXHJcbiAgICAvLyBwcmV2ZW50IHZpdGUgZnJvbSBvYnNjdXJpbmcgcnVzdCBlcnJvcnNcclxuICAgIGNsZWFyU2NyZWVuOiBmYWxzZSxcclxuICAgIC8vIHRhdXJpIGV4cGVjdHMgYSBmaXhlZCBwb3J0LCBmYWlsIGlmIHRoYXQgcG9ydCBpcyBub3QgYXZhaWxhYmxlXHJcbiAgICBzZXJ2ZXI6IHtcclxuICAgICAgaG9zdDogJzAuMC4wLjAnLCAvLyBsaXN0ZW4gb24gYWxsIGFkZHJlc3Nlc1xyXG4gICAgICBwb3J0OiA1MTc0LFxyXG4gICAgICBzdHJpY3RQb3J0OiB0cnVlLFxyXG4gICAgICBobXI6IHtcclxuICAgICAgICBwcm90b2NvbDogJ3dzJyxcclxuICAgICAgICBob3N0LFxyXG4gICAgICAgIHBvcnQ6IDUxODQsXHJcbiAgICAgIH0sXHJcbiAgICB9LFxyXG4gICAgLy8gdG8gbWFrZSB1c2Ugb2YgYFRBVVJJX0RFQlVHYCBhbmQgb3RoZXIgZW52IHZhcmlhYmxlc1xyXG4gICAgLy8gaHR0cHM6Ly90YXVyaS5zdHVkaW8vdjEvYXBpL2NvbmZpZyNidWlsZGNvbmZpZy5iZWZvcmVkZXZjb21tYW5kXHJcbiAgICBlbnZQcmVmaXg6IFtcIlZJVEVfXCIsIFwiVEFVUklfXCJdLFxyXG4gICAgYnVpbGQ6IHtcclxuICAgICAgLy8gVGF1cmkgc3VwcG9ydHMgZXMyMDIxXHJcbiAgICAgIHRhcmdldDogcHJvY2Vzcy5lbnYuVEFVUklfUExBVEZPUk0gPT0gXCJ3aW5kb3dzXCIgPyBcImNocm9tZTEwNVwiIDogXCJzYWZhcmkxM1wiLFxyXG4gICAgICAvLyBkb24ndCBtaW5pZnkgZm9yIGRlYnVnIGJ1aWxkc1xyXG4gICAgICBtaW5pZnk6IHByb2Nlc3MuZW52LlRBVVJJX0RFQlVHID8gZmFsc2UgOiAnZXNidWlsZCcsXHJcbiAgICAgIC8vIHByb2R1Y2Ugc291cmNlbWFwcyBmb3IgZGVidWcgYnVpbGRzXHJcbiAgICAgIHNvdXJjZW1hcDogISFwcm9jZXNzLmVudi5UQVVSSV9ERUJVRyxcclxuICAgICAgY2h1bmtTaXplV2FybmluZ0xpbWl0OiAyMDAwXHJcbiAgICB9LFxyXG4gICAgXHJcbiAgICBvcHRpbWl6ZURlcHM6e1xyXG4gICAgICBuZWVkc0ludGVyb3A6W1xyXG4gICAgICAgIFwiQG1sYy1haS93ZWItdG9rZW5pemVyc1wiXHJcbiAgICAgIF1cclxuICAgIH0sXHJcblxyXG4gICAgcmVzb2x2ZTp7XHJcbiAgICAgIGFsaWFzOntcclxuICAgICAgICAnc3JjJzonL3NyYycsXHJcbiAgICAgICAgJ21vZHVsZXMnOiAnL21vZHVsZXMnXHJcbiAgICAgIH1cclxuICAgIH1cclxufX0pO1xyXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQStXLFNBQVMsb0JBQW9CO0FBQzVZLFNBQVMsY0FBYztBQUN2QixPQUFPLHNCQUFzQjtBQUM3QixPQUFPLFVBQVU7QUFDakIsU0FBUyxvQkFBb0I7QUFDN0IsT0FBTyxtQkFBbUI7QUFHMUIsSUFBTyxzQkFBUSxhQUFhLFlBQVk7QUFFdEMsUUFBTSxPQUFPLE1BQU0sYUFBYTtBQUVoQyxTQUFPO0FBQUEsSUFDTCxTQUFTO0FBQUEsTUFFUCxPQUFPO0FBQUEsUUFDTCxZQUFZO0FBQUEsVUFDVixpQkFBaUI7QUFBQSxZQUNmLFlBQVk7QUFBQSxVQUNkLENBQUM7QUFBQSxRQUNIO0FBQUEsUUFDQSxRQUFRLENBQUMsU0FBUyxZQUFZO0FBRTVCLGNBQUksUUFBUSxLQUFLLFdBQVcsT0FBTztBQUFHO0FBQ3RDLGtCQUFRLE9BQU87QUFBQSxRQUNqQjtBQUFBLE1BQ0YsQ0FBQztBQUFBLE1BQ0QsS0FBSztBQUFBLE1BQ0wsY0FBYztBQUFBLElBQ2hCO0FBQUE7QUFBQTtBQUFBLElBSUEsYUFBYTtBQUFBO0FBQUEsSUFFYixRQUFRO0FBQUEsTUFDTixNQUFNO0FBQUE7QUFBQSxNQUNOLE1BQU07QUFBQSxNQUNOLFlBQVk7QUFBQSxNQUNaLEtBQUs7QUFBQSxRQUNILFVBQVU7QUFBQSxRQUNWO0FBQUEsUUFDQSxNQUFNO0FBQUEsTUFDUjtBQUFBLElBQ0Y7QUFBQTtBQUFBO0FBQUEsSUFHQSxXQUFXLENBQUMsU0FBUyxRQUFRO0FBQUEsSUFDN0IsT0FBTztBQUFBO0FBQUEsTUFFTCxRQUFRLFFBQVEsSUFBSSxrQkFBa0IsWUFBWSxjQUFjO0FBQUE7QUFBQSxNQUVoRSxRQUFRLFFBQVEsSUFBSSxjQUFjLFFBQVE7QUFBQTtBQUFBLE1BRTFDLFdBQVcsQ0FBQyxDQUFDLFFBQVEsSUFBSTtBQUFBLE1BQ3pCLHVCQUF1QjtBQUFBLElBQ3pCO0FBQUEsSUFFQSxjQUFhO0FBQUEsTUFDWCxjQUFhO0FBQUEsUUFDWDtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsSUFFQSxTQUFRO0FBQUEsTUFDTixPQUFNO0FBQUEsUUFDSixPQUFNO0FBQUEsUUFDTixXQUFXO0FBQUEsTUFDYjtBQUFBLElBQ0Y7QUFBQSxFQUNKO0FBQUMsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
