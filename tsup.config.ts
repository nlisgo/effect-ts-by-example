import { defineConfig } from 'tsup';
import { readdirSync } from 'fs';
import { join } from 'path';

// Auto-discover entry points: all .ts files in src root, excluding subdirectories
const entries = readdirSync('src')
  .filter(file => file.endsWith('.ts'))
  .reduce((acc, file) => {
    const name = file.replace('.ts', '');
    acc[name] = join('src', file);
    return acc;
  }, {} as Record<string, string>);

export default defineConfig({
  entry: entries,
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  bundle: true,
  shims: false,
  skipNodeModulesBundle: true,
  outDir: 'dist',
  treeshake: true,
});