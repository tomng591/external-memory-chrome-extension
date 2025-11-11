import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import fs from 'fs';

// Plugin to copy public files (manifest, icons, etc) to dist
const copyPublicPlugin = () => {
  return {
    name: 'copy-public-files',
    writeBundle() {
      // Copy manifest.json
      const manifestSrc = path.resolve(__dirname, 'public/manifest.json');
      const manifestDest = path.resolve(__dirname, 'dist/manifest.json');
      if (fs.existsSync(manifestSrc)) {
        fs.copyFileSync(manifestSrc, manifestDest);
      }

      // Copy icons
      const iconsSrc = path.resolve(__dirname, 'public/icons');
      const iconsDest = path.resolve(__dirname, 'dist/icons');
      if (fs.existsSync(iconsSrc)) {
        if (!fs.existsSync(iconsDest)) {
          fs.mkdirSync(iconsDest, { recursive: true });
        }
        fs.readdirSync(iconsSrc).forEach(file => {
          fs.copyFileSync(
            path.join(iconsSrc, file),
            path.join(iconsDest, file)
          );
        });
      }
    },
  };
};

export default defineConfig({
  plugins: [react(), tailwindcss(), copyPublicPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@types': path.resolve(__dirname, './src/types'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@services': path.resolve(__dirname, './src/services'),
      '@adapters': path.resolve(__dirname, './src/adapters'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    minify: 'esbuild',
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        popup: path.resolve(__dirname, 'public/popup.html'),
        content: path.resolve(__dirname, 'src/content/index.ts'),
        injected: path.resolve(__dirname, 'src/content/injected.ts'),
        background: path.resolve(__dirname, 'src/background.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name].js',
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },
});
