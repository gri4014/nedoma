import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 3004,
    https: {
      key: fs.readFileSync(path.resolve(__dirname, '../certificates/localhost.key')),
      cert: fs.readFileSync(path.resolve(__dirname, '../certificates/localhost.crt')),
    },
  },
});
