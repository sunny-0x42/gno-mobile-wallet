import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { copyFileSync, mkdirSync, existsSync, readFileSync, writeFileSync } from 'fs';

function extensionCopyPlugin() {
  return {
    name: 'extension-copy',
    closeBundle() {
      const dist = path.resolve(__dirname, 'dist');
      mkdirSync(path.join(dist, 'icons'), { recursive: true });
      // Copy manifest
      copyFileSync(path.resolve(__dirname, 'manifest.json'), path.join(dist, 'manifest.json'));
      // Icons: reuse app icon if present
      const srcIcon = path.resolve(__dirname, '../assets/icon.png');
      for (const size of ['icon16.png', 'icon48.png', 'icon128.png']) {
        const dest = path.join(dist, 'icons', size);
        if (existsSync(srcIcon)) copyFileSync(srcIcon, dest);
      }
      // Fix HTML paths if needed — vite multi-page outputs popup.html at root when configured
    },
  };
}

export default defineConfig({
  root: path.resolve(__dirname),
  // Relative asset URLs required for chrome-extension:// pages
  base: './',
  plugins: [react(), extensionCopyPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../src'),
      buffer: 'buffer/',
      // Avoid RN AsyncStorage in extension bundle — storagePort injects chrome storage
      '@react-native-async-storage/async-storage': path.resolve(
        __dirname,
        'src/shims/async-storage.ts',
      ),
      'react-native': path.resolve(__dirname, 'src/shims/react-native.ts'),
    },
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    'process.env': {},
    global: 'globalThis',
  },
  optimizeDeps: {
    include: ['buffer'],
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    modulePreload: false,
    cssCodeSplit: true,
    rollupOptions: {
      input: {
        popup: path.resolve(__dirname, 'popup.html'),
        approval: path.resolve(__dirname, 'approval.html'),
        background: path.resolve(__dirname, 'src/background/index.ts'),
        content: path.resolve(__dirname, 'src/content/bridge.ts'),
        inpage: path.resolve(__dirname, 'src/content/inpage.ts'),
      },
      output: {
        entryFileNames: (chunk) => {
          if (chunk.name === 'background') return 'background.js';
          if (chunk.name === 'content') return 'content.js';
          if (chunk.name === 'inpage') return 'inpage.js';
          return 'assets/[name]-[hash].js';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
        // Keep content/inpage free of shared chunks when possible
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@gnolang') || id.includes('@cosmjs') || id.includes('bip39')) {
              return 'vendor-gno';
            }
          }
          return undefined;
        },
      },
    },
    target: 'esnext',
    minify: true,
  },
  publicDir: false,
});
