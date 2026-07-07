import { defineConfig } from 'tsdown';

export default defineConfig({
    target: ['node18', 'es2017'],
    format: ['esm', 'cjs'],
    entry: {
        types: 'src/types/index.ts',
        index: 'src/index.ts',
        infrastructure: 'src/infrastructure/index.ts',
    },
    dts: {
        sourcemap: true,
        tsconfig: './tsconfig.build.json',
    },
    outExtensions: (ctx) => ({
        dts: '.d.mts',
        js: ctx.format === 'cjs' ? '.cjs' : '.mjs',
    }),
    clean: true,
    outDir: 'dist',
});