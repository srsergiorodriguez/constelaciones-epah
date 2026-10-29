import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// En GitHub Pages el sitio vive bajo /constelacion-epah/.
// En local y en preview, BASE_PATH vacío deja la raíz.
export default defineConfig({
  base: process.env.BASE_PATH || '/',
  plugins: [svelte()],
})
