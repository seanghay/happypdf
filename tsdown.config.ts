import { defineConfig } from 'tsdown';
import pkg from './package.json' with { type: 'json' };

const runtimeDeps = Object.keys(pkg.dependencies);

export default defineConfig([
  {
    // Library output: runtime dependencies stay external so consumers
    // deduplicate them.
    entry: ['src/index.ts'],
    outDir: 'dist',
    format: ['esm', 'cjs'],
    external: runtimeDeps,
    dts: true,
    sourcemap: true,
    clean: true,
    target: 'es2020',
    treeshake: true,
  },
  {
    // Standalone browser bundle: everything inlined, exposed as `happypdf`.
    entry: ['src/index.ts'],
    outDir: 'dist',
    format: ['iife'],
    globalName: 'happypdf',
    outputOptions: { entryFileNames: 'happypdf.min.js' },
    noExternal: [/.*/],
    dts: false,
    sourcemap: true,
    minify: true,
    clean: false,
    target: 'es2020',
  },
]);
