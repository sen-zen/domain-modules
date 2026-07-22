import { defineConfig } from 'tsdown';


export default defineConfig({
    target: ['node18', 'es2017'],
    format: ['esm', 'cjs'],
    entry: {
        // Публичный API - все экспорты из index.ts
        index: 'src/index.ts',

        // Typings для внешних потребителей (Domain слой)
        types: 'src/types/index.ts',

        // Application Layer - Use Cases всех модулей
        application: 'src/index.application.ts',

        // Infrastructure Layer - DI контейнеры, декораторы, ошибки, утилиты
        container: 'src/di/Container.ts',
        di: 'src/di/index.ts',
        decorators: 'src/decorators/Module.ts',
        errors: 'src/errors/index.ts',
        utils: 'src/utils/result.ts',
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
    external: [
        'node:fs/promises',
        'node:path',
        'node:url',
    ],
});
