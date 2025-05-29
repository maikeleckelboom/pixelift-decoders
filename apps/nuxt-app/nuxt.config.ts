import { dirname } from 'path';
import { fileURLToPath } from 'url';

const currentDir = dirname(fileURLToPath(import.meta.url));

export default defineNuxtConfig({
  compatibilityDate: '2025-05-15',
  devtools: { enabled: true },
  modules: ['@nuxt/image'],
  typescript: {
    strict: true,
    typeCheck: true
  },
  future: {
    compatibilityVersion: 4
  }
});
