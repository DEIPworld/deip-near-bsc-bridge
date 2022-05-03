import { defineNuxtConfig } from "nuxt3";
import inject from "@rollup/plugin-inject";

export default defineNuxtConfig({
  css: ["~/assets/css/styles.css"],
  ssr: false,
  // nitro: {
  //   preset: "firebase",
  // },
  build: {
    babel: {

    },
    transpile: [],
    postcss: {
      postcssOptions: {
        plugins: {
          tailwindcss: {},
          autoprefixer: {},
        },
      },
    },
  },


  vite: {
    define: {
      "process.env": {},
      global: {},
    },
    // plugins: [
    //   inject({
    //     Buffer: ["buffer", "Buffer"],
    //   }),
    // ],
    // optimizeDeps: {
    //   include: ["buffer"],
    // },
    //
    // PROD
    // define: {
    //   'process.env': {}
    // }
  },

  buildModules: ["@pinia/nuxt"],
});
