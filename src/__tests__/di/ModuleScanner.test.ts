import { mkdir, mkdtemp, rm } from 'node:fs/promises';
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

            await createTestModuleFile(dir, 'ModuleA');
            await createTestModuleFile(dir, 'ModuleB');
            await createTestComponentFile(dir, 'SharedRepo', {
                scope: 'singleton',
                dependencies: []
            });

            await scanner.scan(dir);

            expect(scanner.getContainer().has('SharedRepo')).toBe(true);
        });
    });

    describe('scan() с путями к компонентам', () => {
        it('должен сканировать модули с указанными путями к компонентам', async () => {
            const dir = await makeTempDir();

            const servicesDir = join(dir, 'services');
            const repositoriesDir = join(dir, 'repositories');
            const useCasesDir = join(dir, 'use-cases');

            await mkdir(servicesDir, { recursive: true });
            await mkdir(repositoriesDir, { recursive: true });
            await mkdir(useCasesDir, { recursive: true });

            // Создаем компоненты
            await createTestComponentFile(repositoriesDir, 'UserRepository', {
                scope: 'singleton',
                dependencies: [],
                methods: {
                    findUser: 'return { id: 1, name: "test" };'
                }
            });

            await createTestComponentFile(servicesDir, 'TokenService', {
                scope: 'singleton',
                dependencies: [],
                methods: {
                    generateToken: 'return "token";'
                }
            });

            await createTestComponentFile(useCasesDir, 'LoginUseCase', {
                scope: 'request',
                dependencies: ['UserRepository', 'TokenService'],
                methods: {
                    execute: 'return { success: true };'
                }
            });

            await createTestModuleFile(dir, 'AuthModule', {
                components: [
                    './repositories',
                    './services',
                    './use-cases'
                ]
            });

            await scanner.scan(dir);

            expect(container.has('UserRepository')).toBe(true);
            expect(container.has('TokenService')).toBe(true);
            expect(container.has('LoginUseCase')).toBe(true);

            expect(scanner.hasModule('AuthModule')).toBe(true);

            const userRepo = container.get('UserRepository');
            expect((userRepo as any).findUser()).toEqual({ id: 1, name: 'test' });

            const tokenService = container.get('TokenService');
            expect((tokenService as any).generateToken()).toBe('token');

            container.runInRequestScope(() => {
                const loginUseCase = container.get('LoginUseCase');
                expect((loginUseCase as any).execute()).toEqual({ success: true });
            });
        });

        it('должен сканировать компоненты из нескольких модулей с разными путями', async () => {
            const dir = await makeTempDir();

            const coreDir = join(dir, 'core');
            const authDir = join(dir, 'auth');
            const userDir = join(dir, 'user');

            await mkdir(coreDir, { recursive: true });
            await mkdir(authDir, { recursive: true });
            await mkdir(userDir, { recursive: true });

            const coreServicesDir = join(coreDir, 'services');
            const authRepositoriesDir = join(authDir, 'repositories');
            const authServicesDir = join(authDir, 'services');
            const userUseCasesDir = join(userDir, 'use-cases');

            await mkdir(coreServicesDir, { recursive: true });
            await mkdir(authRepositoriesDir, { recursive: true });
            await mkdir(authServicesDir, { recursive: true });
            await mkdir(userUseCasesDir, { recursive: true });


            await createTestModuleFile(coreDir, 'CoreModule', {
                components: ['./services']
            })
            await createTestComponentFile(coreServicesDir, 'CoreService', {
                scope: 'singleton'
            });


            await createTestModuleFile(authDir, 'AuthModule', {
                components: ['./repositories', './services'],
                dependencies: ['CoreModule']
            })
            await createTestComponentFile(authRepositoriesDir, 'AuthRepository', {
                scope: 'singleton',
            });
            await createTestComponentFile(authServicesDir, 'AuthService', {
                scope: 'singleton',
                dependencies: ['AuthRepository', 'CoreService']
            });


            await createTestModuleFile(userDir, 'UserModule', {
                components: ['./use-cases'],
                dependencies: ['AuthModule']
            })
            await createTestComponentFile(userUseCasesDir, 'GetUserUseCase', {
                scope: 'request',
                dependencies: ['AuthService'],
                methods: { execute: 'return { success: true };' }
            });

            await scanner.scan(dir);

            expect(scanner.hasModule('CoreModule')).toBe(true);
            expect(scanner.hasModule('AuthModule')).toBe(true);
            expect(scanner.hasModule('UserModule')).toBe(true);

            expect(container.has('CoreService')).toBe(true);
            expect(container.has('AuthRepository')).toBe(true);
            expect(container.has('AuthService')).toBe(true);
            expect(container.has('GetUserUseCase')).toBe(true);

            // ✅ Проверяем работу компонентов
            const coreService = container.get('CoreService');
            expect(coreService).toBeDefined();

            const authService = container.get('AuthService');
            expect(authService).toBeDefined();

            container.runInRequestScope(() => {
                const getUserUseCase = container.get('GetUserUseCase');
                expect(getUserUseCase).toBeDefined();
                expect((getUserUseCase as any).execute()).toEqual({ success: true });
            });
        });

        it('должен обрабатывать модули с пустым массивом компонентов', async () => {
            const dir = await makeTempDir();
            const moduleDir = join(dir, 'empty');

            await mkdir(moduleDir, { recursive: true });
            await createTestModuleFile(moduleDir, 'EmptyModule');

            await scanner.scan(moduleDir);

            expect(scanner.hasModule('EmptyModule')).toBe(true);
            expect(console.info).toHaveBeenCalledWith(
                expect.stringContaining('[ModuleScanner] Registered module: EmptyModule')
            );
        });

        it('должен обрабатывать модули с компонентами из родительской директории', async () => {
            const dir = await makeTempDir();
            const moduleDir = join(dir, 'test');
            const sharedDir = join(dir, 'shared');

            await mkdir(moduleDir, { recursive: true });
            await mkdir(sharedDir, { recursive: true });

            await createTestModuleFile(moduleDir, 'TestModule', { components: ['../shared'] })
            await createTestComponentFile(sharedDir, 'SharedService', {
                scope: 'singleton',
                dependencies: []
            });

            await scanner.scan(moduleDir);

            expect(scanner.hasModule('TestModule')).toBe(true);
            expect(container.has('SharedService')).toBe(true);

            const sharedService = container.get('SharedService');
            expect(sharedService).toBeDefined();
        });

        it('должен пропускать несуществующие пути к компонентам', async () => {
            const dir = await makeTempDir();
            const moduleDir = join(dir, 'test');

            await mkdir(moduleDir, { recursive: true });
            await createTestModuleFile(moduleDir, 'TestModule', { components: ['./non-existent'] });

            await scanner.scan(moduleDir);

            expect(scanner.hasModule('TestModule')).toBe(true);
            expect(console.warn).toHaveBeenCalledWith(
                expect.stringContaining('[ModuleScanner] Found 0 components')
            );
        });

        it('должен правильно обрабатывать вложенные пути к компонентам', async () => {
            const dir = await makeTempDir();
            const moduleDir = join(dir, 'deep');
            const deepDir = join(moduleDir, 'deep', 'nested', 'path', 'to', 'components');

            await mkdir(deepDir, { recursive: true });
            await createTestModuleFile(moduleDir, 'DeepModule', { components: ['./'] })
            await createTestComponentFile(deepDir, 'DeepComponent', {
                scope: 'singleton',
                dependencies: []
            });

            await scanner.scan(moduleDir);
            expect(scanner.hasModule('DeepModule')).toBe(true);
            expect(container.has('DeepComponent')).toBe(true);

            const deepComponent = container.get('DeepComponent');
            expect(deepComponent).toBeDefined();
        });
    });
}); 
