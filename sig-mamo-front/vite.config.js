import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Faz ele ouvir todas as conexões
    allowedHosts: 'easel-borrowing-protract.ngrok-free.dev', // Autoriza qualquer host (incluindo o do Ngrok)
  }
})