import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { apiEditor } from './scripts/editor/api.mjs'

// En GitHub Pages el sitio vive bajo /constelacion-epah/.
// En local y en preview, BASE_PATH vacío deja la raíz.
export default defineConfig(({ command }) => ({
  base: process.env.BASE_PATH || '/',
  // la API del editor solo vive en el servidor de desarrollo
  plugins: [svelte(), ...(command === 'serve' ? [apiEditor()] : [])],
  build: {
    // el editor no se publica: el sitio es solo index.html
    rollupOptions: { input: 'index.html' },
  },
}))
