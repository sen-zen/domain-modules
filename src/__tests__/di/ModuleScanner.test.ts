import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ModuleContainer } from '../../di/ModuleContainer';
import { ModuleScanner } from '../../di/ModuleScanner';
import { Module } from '../../decorators/Module';

export async function createTestModuleFile(
    dir: string,
    name: string,
    config: any = {}
): Promise<string> {
    const filePath = `${dir}/${name}.module.js`;
    const content = `
        export class ${name} {
            static __moduleConfig = {
                name: '${name}',
                useCases: ${JSON.stringify(config.useCases || [])},
                repositories: ${JSON.stringify(config.repositories || [])},
                services: ${JSON.stringify(config.services || [])},
                dependencies: ${JSON.stringify(config.dependencies || [])},
                enabled: ${config.enabled !== false},
                version: '${config.version || '1.0.0'}',
                config: ${JSON.stringify(config.config || null)},
            };
        }
    `;

    await writeFile(filePath, content);
    return filePath;
}

let tmpDirs: string[] = [];

async function makeTempDir(): Promise<string> {
    const dir = await mkdtemp(join(process.cwd(), '.tmp-modules-'));
    tmpDirs.push(dir);
    return dir;
}

describe('ModuleScanner', () => {
    let scanner: ModuleScanner;
    let container: ModuleContainer;

    beforeEach(() => {
        if (scanner) {
            scanner.clear();
        };

        container = new ModuleContainer();
        scanner = new ModuleScanner(container);

        vi.spyOn(console, 'info').mockImplementation(() => { });
        vi.spyOn(console, 'warn').mockImplementation(() => { });
        vi.spyOn(console, 'error').mockImplementation(() => { });
    });

    afterEach(async () => {
        await Promise
            .all(tmpDirs.map((d) => rm(d, { recursive: true, force: true })))
            .then(() => { tmpDirs = [] });
    })

    describe('getInstance()', () => {
        it('возвращает один и тот же экземпляр при повторных вызовах', () => {
            const first = ModuleScanner.getInstance(container);
            const second = ModuleScanner.getInstance(container);

            expect(first).toBe(second);
            expect(first.getResult()).toEqual({ modulesCount: 0, failedModules: [], registeredModules: [] });
        });
    });

    describe('registerModule()', () => {
        it('без контейнера — ничего не регистрирует', () => {
            class M { }
            scanner.registerModule(M);
            expect(scanner.getModules().size).toBe(0);
        });

        it.each([[null], [undefined], [false], [0], ['']])('игнорирует falsy moduleClass (%s)', (falsyClass) => {
            scanner.registerModule(falsyClass);
            expect(scanner.getModules().size).toBe(0);
        });

        it('не регистрирует дублирующиеся модули', () => {
            @Module({
                name: 'duplicate-module',
                useCases: [],
                repositories: [],
            })
            class DuplicateModule { }

            scanner.registerModule(DuplicateModule);
            scanner.registerModule(DuplicateModule);

            expect(scanner.getModules().size).toBe(1);
            expect(scanner.getModules().get('duplicate-module')).toBe(DuplicateModule);
        });

        it('обрабатывает ошибки при регистрации', () => {
            @Module({
                name: 'test-module',
                useCases: [],
                repositories: [],
                dependencies: ['non-existent-module'],
            })
            class TestModule { }

            scanner.registerModule(TestModule);
            expect(scanner.getModules().size).toBe(0);
        });
    });

    describe('getModules()', () => {
        it('возвращает Map зарегистрированных модулей', () => {
            @Module({
                name: 'M1',
                useCases: [],
                repositories: [],
            })
            class M1 { }

            scanner.registerModule(M1);

            const modules = scanner.getModules();
            expect(modules).toBeInstanceOf(Map);
            expect([...modules.keys()]).toEqual(['M1']);
        });
    });

    describe('clear()', () => {
        it('очищает модули и вызывает container.clear()', () => {
            @Module({
                name: 'M1',
                useCases: [],
                repositories: [],
            })
            class M1 { }
            scanner.registerModule(M1);

            expect(scanner.getModules().size).toBe(1);
            expect(container.getAllModules().size).toBe(1);

            scanner.clear();

            expect(scanner.getModules().size).toBe(0);
            expect(container.getAllModules().size).toBe(0);
        });

        it('без контейнера — просто очищает Map, не падает', () => {
            expect(() => scanner.clear()).not.toThrow();
            expect(scanner.getModules().size).toBe(0);
        });
    });

    describe('scan()', () => {
        it('при ошибке чтения директории — логирует ошибку и возвращает this', async () => {
            const missing = join(process.cwd(), 'definitely-not-exists-42');
            const result = await scanner.scan(missing);

            expect(result).toBe(scanner);
            expect(console.error).toHaveBeenCalled();
            expect(scanner.getModules().size).toBe(0);
        });

        it('сканирует директорию и регистрирует модули', async () => {
            const dir = await makeTempDir();

            await createTestModuleFile(dir, 'UserModule', {
                dependencies: ['AuthModule', 'CoreModule'],
            });
            await createTestModuleFile(dir, 'AuthModule', {
                dependencies: ['CoreModule'],
            });

            await createTestModuleFile(dir, 'CoreModule');

            const result = await scanner.scan(dir);

            expect(result).toBe(scanner);
            expect(scanner.getModules().size).toBe(3);
            expect(scanner.getModules().has('CoreModule')).toBe(true);
            expect(scanner.getModules().has('AuthModule')).toBe(true);
            expect(scanner.getModules().has('UserModule')).toBe(true);
        });
    });
}); 
