import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  // base path jen pro GitHub Pages build, na dev serveru root
  base: command === 'build' ? '/kalkulace-projektu-sg/' : '/',
}))
