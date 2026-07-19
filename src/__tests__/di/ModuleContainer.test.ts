import { describe, it, vi, expect, beforeEach } from 'vitest';
import { ModuleContainer } from '../../di/ModuleContainer';
import { ComponentConfig } from '../../decorators/Component';
import { ModuleConfig } from '../../decorators/Module';
import { Scope } from '../../types';

describe('ModuleContainer', () => {
    let container: ModuleContainer;

    class MockUseCase {
        static name = 'TestUseCase';
        static __componentConfig: ComponentConfig = { name: MockUseCase.name }
    }

    class MockService {
        static name = 'TestService';
        static __componentConfig: ComponentConfig = { name: MockService.name }
    }

    class MockRepository {
        static name = 'TestRepository';
        static __componentConfig: ComponentConfig = { name: MockRepository.name }
    }

    class MockModule {
        static name = 'TestModule';
        static __moduleConfig: Omit<ModuleConfig, 'services'> & { services: any[] } = {
            name: MockModule.name,
            useCases: [],
            repositories: [],
            services: [],
            dependencies: [],
            enabled: true,
            version: '1.0.0' as const,
        };
    }

    beforeEach(() => {
        MockModule.__moduleConfig.useCases = [];
        MockModule.__moduleConfig.services = [];
        MockModule.__moduleConfig.repositories = [];
        MockModule.__moduleConfig.dependencies = [];

        container = new ModuleContainer({ cache: true });

        vi.spyOn(console, 'info').mockImplementation(() => { });
        vi.spyOn(console, 'warn').mockImplementation(() => { });
        vi.spyOn(console, 'error').mockImplementation(() => { });
    });

    describe('метод registerModule()', () => {
        it('должен регистрировать модуль', () => {
            container.registerModule(MockModule);
            expect(container.hasModule(MockModule.name)).toBe(true);
        });

        it.each<[Scope]>([['request'], ['singleton'], ['transient']])('должен регистрировать UseCase как %s', (scope) => {
            MockModule.__moduleConfig.useCases.push({ class: MockUseCase, scope });
            container.registerModule(MockModule);
            expect(container.has(MockUseCase.name)).toBe(true);
        });

        it.each<[Scope]>([['request'], ['singleton'], ['transient']])('должен регистрировать Service как %s', (scope) => {
            MockModule.__moduleConfig.useCases.push({ class: MockService, scope });
            container.registerModule(MockModule);
            expect(container.has(MockService.name)).toBe(true);
        });

        it.each<[Scope]>([['request'], ['singleton'], ['transient']])('должен регистрировать Service как %s', (scope) => {
            MockModule.__moduleConfig.useCases.push({ class: MockRepository, scope });
            container.registerModule(MockModule);
            expect(container.has(MockRepository.name)).toBe(true);
        });

        it('должен проверить зависимости модуля', () => {
            // Создаем существующий модуль
            class ExistingModule {
                static name = 'ExistingModule';
                static __moduleConfig = {
                    name: ExistingModule.name,
                    description: '',
                    version: '1.0.0',
                    useCases: [],
                    repositories: [],
                    services: [],
                    dependencies: [],
                    enabled: true,
                    config: null,
                };
            }

            container.registerModule(ExistingModule);

            // Создаем модуль с зависимостью от существующего
            class DependentModule {
                static name = 'DependentModule';
                static __moduleConfig = {
                    name: DependentModule.name,
                    description: '',
                    version: '1.0.0',
                    useCases: [],
                    repositories: [],
                    services: [],
                    dependencies: [ExistingModule.name],
                    enabled: true,
                    config: null,
                };
            }

            container.registerModule(DependentModule);

            expect(container.hasModule(DependentModule.name)).toBe(true);
        });

        it('должен выбрасывать ошибку при зависимости от незарегистрированного модуля', () => {
            // Создаем модуль с зависимостью от несуществующего модуля
            class InvalidModule {
                static name = 'InvalidModule';
                static __moduleConfig = {
                    name: 'InvalidModule',
                    description: '',
                    version: '1.0.0',
                    useCases: [],
                    repositories: [],
                    services: [],
                    dependencies: ['NonExistentModule'],
                    enabled: true,
                    config: null,
                };
            }

            expect(() => container.registerModule(InvalidModule))
                .toThrow('Module "InvalidModule" depends on "NonExistentModule" which is not registered');
        });
    });

    describe('метод getModule()', () => {
        it('должен возвращать информацию о модуле', () => {
            class TestModule {
                static name = 'TestModule';
                static __moduleConfig = {
                    name: 'TestModule',
                    description: '',
                    version: '1.0.0',
                    useCases: [],
                    repositories: [],
                    services: [],
                    dependencies: [],
                    enabled: true,
                    config: null,
                };
            }

            container.registerModule(TestModule);

            const module = container.getModule('TestModule');

            expect(module?.name).toBe('TestModule');
            expect(module?.enabled).toBe(true);
        });

        it('должен возвращать undefined для незарегистрированного модуля', () => {
            const module = container.getModule('NonExistentModule');
            expect(module).toBeUndefined();
        });
    });

    describe('метод getUseCasesByModule()', () => {
        it('должен возвращать UseCase по модулю', () => {
            class TestModule {
                static name = 'TestModule';
                static __moduleConfig = {
                    name: 'TestModule',
                    description: '',
                    version: '1.0.0',
                    useCases: [
                        { class: class UseCase1 { }, scope: 'request' as Scope },
                        { class: class UseCase2 { }, scope: 'request' as Scope }
                    ],
                    repositories: [],
                    services: [],
                    dependencies: [],
                    enabled: true,
                    config: null,
                };
            }

            container.registerModule(TestModule);

            const useCases = container.getUseCasesByModule('TestModule');

            expect(useCases.length).toBe(2);
        });

        it('должен возвращать пустой массив для незарегистрированного модуля', () => {
            const useCases = container.getUseCasesByModule('NonExistentModule');
            expect(useCases).toEqual([]);
        });
    });

    describe('метод hasModule()', () => {
        it('должен возвращать true для зарегистрированного модуля', () => {
            class TestModule {
                static name = 'TestModule';
                static __moduleConfig = {
                    name: 'TestModule',
                    description: '',
                    version: '1.0.0',
                    useCases: [],
                    repositories: [],
                    services: [],
                    dependencies: [],
                    enabled: true,
                    config: null,
                };
            }

            container.registerModule(TestModule);

            expect(container.hasModule('TestModule')).toBe(true);
        });

        it('должен возвращать false для незарегистрированного модуля', () => {
            expect(container.hasModule('NonExistentModule')).toBe(false);
        });
    });

    describe('метод clear()', () => {
        it('должен очищать все модули и контейнер', () => {
            class TestModule {
                static name = 'TestModule';
                static __moduleConfig = {
                    name: 'TestModule',
                    description: '',
                    version: '1.0.0',
                    useCases: [],
                    repositories: [],
                    services: [],
                    dependencies: [],
                    enabled: true,
                    config: null,
                };
            }

            container.registerModule(TestModule);

            expect(container.hasModule('TestModule')).toBe(true);

            container.clear();

            expect(container.hasModule('TestModule')).toBe(false);
        });
    });

    describe('метод getAllModules()', () => {
        it('должен возвращать Map всех зарегистрированных модулей', () => {
            class Module1 {
                static name = 'Module1';
                static __moduleConfig = {
                    name: 'Module1',
                    description: '',
                    version: '1.0.0',
                    useCases: [],
                    repositories: [],
                    services: [],
                    dependencies: [],
                    enabled: true,
                    config: null,
                };
            }

            class Module2 {
                static name = 'Module2';
                static __moduleConfig = {
                    name: 'Module2',
                    description: '',
                    version: '1.0.0',
                    useCases: [],
                    repositories: [],
                    services: [],
                    dependencies: [],
                    enabled: true,
                    config: null,
                };
            }

            container.registerModule(Module1);
            container.registerModule(Module2);

            const allModules = container.getAllModules();

            expect(allModules.has('Module1')).toBe(true);
            expect(allModules.has('Module2')).toBe(true);
        });
    });

    describe('Scope handling', () => {
        it('должен регистрировать UseCase как request scope', () => {
            class UseCaseWithScope {
                static name = 'UseCaseWithScope';
                static __componentConfig: ComponentConfig = {
                    name: 'UseCaseWithScope',
                    scope: 'request',
                    dependencies: []
                };
                static __useCaseConfig = {
                    module: 'TestModule',
                    cache: false,
                    timeout: 0,
                    tags: [],
                    requiresAuth: false,
                    roles: [],
                    rateLimit: null,
                    log: { enabled: false, level: 'info' as const }
                };
            }

            class TestModule {
                static name = 'TestModule';
                static __moduleConfig = {
                    name: 'TestModule',
                    description: '',
                    version: '1.0.0',
                    useCases: [{ class: UseCaseWithScope, scope: 'request' as Scope }],
                    repositories: [],
                    services: [],
                    dependencies: [],
                    enabled: true,
                    config: null,
                };
            }

            container.registerModule(TestModule);

            // Проверяем, что компонент зарегистрирован
            expect(container.has('UseCaseWithScope')).toBe(true);
        });

        it('должен регистрировать repository как singleton', () => {
            class RepositoryWithScope {
                static name = 'RepositoryWithScope';
                static __componentConfig: ComponentConfig = {
                    name: 'RepositoryWithScope',
                    scope: 'singleton',
                    dependencies: []
                };
            }

            class TestModule {
                static name = 'TestModule';
                static __moduleConfig = {
                    name: 'TestModule',
                    description: '',
                    version: '1.0.0',
                    useCases: [],
                    repositories: [{ class: RepositoryWithScope, scope: 'singleton' as Scope }],
                    services: [],
                    dependencies: [],
                    enabled: true,
                    config: null,
                };
            }

            container.registerModule(TestModule);

            // Проверяем, что компонент зарегистрирован
            expect(container.has('RepositoryWithScope')).toBe(true);
        });

        it('должен регистрировать service как singleton', () => {
            class ServiceWithScope {
                static name = 'ServiceWithScope';
                static __componentConfig: ComponentConfig = {
                    name: 'ServiceWithScope',
                    scope: 'singleton',
                    dependencies: []
                };
            }

            class TestModule {
                static name = 'TestModule';
                static __moduleConfig = {
                    name: 'TestModule',
                    description: '',
                    version: '1.0.0',
                    useCases: [],
                    repositories: [],
                    services: [{ class: ServiceWithScope, scope: 'singleton' as Scope }],
                    dependencies: [],
                    enabled: true,
                    config: null,
                };
            }

            container.registerModule(TestModule);

            // Проверяем, что компонент зарегистрирован
            expect(container.has('ServiceWithScope')).toBe(true);
        });
    });
});
