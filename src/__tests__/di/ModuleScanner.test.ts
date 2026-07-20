import { writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { ModuleContainer } from '../../di/ModuleContainer';
import { ModuleScanner } from '../../di/ModuleScanner';
import { Module } from '../../decorators/Module';
import { createTestComponentFile, createTestModuleFile } from './utils/test-types';

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
        scanner = new ModuleScanner(container, { log: true });

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
                name: 'duplicate-module'
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
                name: 'M1'
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
                name: 'M1'
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

    describe('scanComponents()', () => {
        it('должен сканировать директорию и регистрировать компоненты', async () => {
            const dir = await makeTempDir();
            await createTestComponentFile(dir, 'UserRepository', {
                scope: 'singleton',
                dependencies: ['PrismaClient']
            });
            await createTestComponentFile(dir, 'TokenService', {
                scope: 'singleton',
                dependencies: []
            });
            await createTestComponentFile(dir, 'LoginUseCase', {
                scope: 'request',
                dependencies: ['UserRepository', 'TokenService']
            });

            await scanner.scanComponents(dir);
            expect(scanner['container'].has('UserRepository')).toBe(true);
            expect(scanner['container'].has('TokenService')).toBe(true);
            expect(scanner['container'].has('LoginUseCase')).toBe(true);
        });

        it('должен игнорировать файлы, которые не экспортируют компоненты', async () => {
            const dir = await makeTempDir();
            const filePath = join(dir, 'not-component.js');

            await writeFile(filePath, 'export class NotComponent {}');
            await scanner.scanComponents(dir);

            expect(scanner['container'].has('NotComponent')).toBe(false);
        });

        it('должен обрабатывать ошибки загрузки файлов и продолжать сканирование', async () => {
            const dir = await makeTempDir();
            await createTestComponentFile(dir, 'ValidComponent');
            await writeFile(join(dir, 'invalid.js'), 'export class Invalid { ... }');
            await scanner.scanComponents(dir);
            expect(scanner['container'].has('ValidComponent')).toBe(true);
            expect(scanner['container'].has('Invalid')).toBe(false);
            expect(console.error).toHaveBeenCalled();
        });

        it('должен рекурсивно обходить поддиректории', async () => {
            const dir = await makeTempDir();
            const subDir = join(dir, 'sub');
            await mkdir(subDir);
            await createTestComponentFile(subDir, 'SubComponent');
            await scanner.scanComponents(dir);

            expect(scanner['container'].has('SubComponent')).toBe(true);
        });
    });

    describe('scan() поиск компонентов внутри модулей', () => {
        it('должен найти компоненты в директории модуля', async () => {
            const dir = await makeTempDir();
            const moduleDir = join(dir, 'auth');

            await mkdir(moduleDir);
            await createTestModuleFile(moduleDir, 'AuthModule');
            await createTestComponentFile(moduleDir, 'AuthRepo', {
                scope: 'singleton',
                dependencies: []
            });
            await createTestComponentFile(moduleDir, 'LoginUseCase', {
                scope: 'request',
                dependencies: ['AuthRepo']
            });

            await scanner.scan(moduleDir);

            expect(scanner.hasModule('AuthModule')).toBe(true);
            const containerInstance = scanner.getContainer();
            expect(containerInstance.has('AuthRepo')).toBe(true);
            expect(containerInstance.has('LoginUseCase')).toBe(true);
        });

        it('должен найти компоненты в поддиректориях модуля', async () => {
            const dir = await makeTempDir();
            const moduleDir = join(dir, 'user');
            const reposDir = join(moduleDir, 'repositories');
            const usecasesDir = join(moduleDir, 'usecases');

            await mkdir(moduleDir, { recursive: true });
            await createTestModuleFile(moduleDir, 'UserModule');


            await mkdir(reposDir, { recursive: true });
            await createTestComponentFile(reposDir, 'UserRepo', {
                scope: 'singleton',
                dependencies: []
            });

            await mkdir(usecasesDir, { recursive: true });
            await createTestComponentFile(usecasesDir, 'GetUserUseCase', {
                scope: 'request',
                dependencies: ['UserRepo']
            });

            await scanner.scan(moduleDir);

            expect(scanner.getContainer().has('UserRepo')).toBe(true);
            expect(scanner.getContainer().has('GetUserUseCase')).toBe(true);
        });

        it('НЕ должен находить компоненты вне директорий модулей', async () => {
            const dir = await makeTempDir();
            const moduleDir = join(dir, 'auth');

            await mkdir(moduleDir);
            await createTestModuleFile(moduleDir, 'AuthModule');
            await createTestComponentFile(dir, 'GlobalRepo', {
                scope: 'singleton',
                dependencies: []
            });

            await scanner.scan(moduleDir);
            expect(scanner.hasModule('AuthModule')).toBe(true);
            expect(scanner.getContainer().has('GlobalRepo')).toBe(false);
        });

        it('должен сканировать компоненты только один раз для директории с несколькими модулями', async () => {
            const dir = await makeTempDir();
            const scanComponentsSpy = vi.spyOn(scanner, 'scanComponents');

            await createTestModuleFile(dir, 'ModuleA');
            await createTestModuleFile(dir, 'ModuleB');
            await createTestComponentFile(dir, 'SharedRepo', {
                scope: 'singleton',
                dependencies: []
            });

            await scanner.scan(dir);

            expect(scanComponentsSpy).toHaveBeenCalledTimes(1);
            expect(scanner.getContainer().has('SharedRepo')).toBe(true);
        });
    });
}); 
