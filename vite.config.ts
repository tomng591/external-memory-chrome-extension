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

      // Copy and rewrite popup.html
      const popupSrc = path.resolve(__dirname, 'public/popup.html');
      const popupDest = path.resolve(__dirname, 'dist/popup.html');
      if (fs.existsSync(popupSrc)) {
        let popupHtml = fs.readFileSync(popupSrc, 'utf-8');
        popupHtml = popupHtml.replace(
          /<script[^>]+src="[^"]*"[^>]*><\/script>/,
          '<script type="module" crossorigin src="/popup.js"></script>'
        );
        fs.writeFileSync(popupDest, popupHtml);
      }

      // Copy and rewrite options.html
      const optionsSrc = path.resolve(__dirname, 'public/options.html');
      const optionsDest = path.resolve(__dirname, 'dist/options.html');
      if (fs.existsSync(optionsSrc)) {
        let optionsHtml = fs.readFileSync(optionsSrc, 'utf-8');
        optionsHtml = optionsHtml.replace(
          /<script[^>]+src="[^"]*"[^>]*><\/script>/,
          '<script type="module" crossorigin src="/options.js"></script>'
        );
        fs.writeFileSync(optionsDest, optionsHtml);
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
        popup: path.resolve(__dirname, 'src/popup-entry.tsx'),
        options: path.resolve(__dirname, 'src/options-entry.tsx'),
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
