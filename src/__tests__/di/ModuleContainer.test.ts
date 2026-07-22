import { ModuleContainer } from '../../di/ModuleContainer';
import { ComponentConfig } from '../../decorators/Component';
import { ModuleConfig, ModuleMetadata } from '../../decorators/Module';
import { Scope } from '../../types';

describe('ModuleContainer', () => {
    let container: ModuleContainer;

    // Мок-классы
    class MockUseCase {
        static name = 'TestUseCase';
        static __componentConfig: Partial<ComponentConfig> = { name: MockUseCase.name };
    }

    // Мок-модуль
    class MockModule {
        static name = 'TestModule';
        static __moduleConfig: Omit<ModuleConfig, 'components'> & { components: any[] } = {
            name: MockModule.name,
            components: [],
            dependencies: [],
            enabled: true,
            version: '1.0.0' as const,
        };
    }

    beforeEach(() => {
        MockModule.__moduleConfig.components = [];
        MockModule.__moduleConfig.dependencies = [];

        if (!container) {
            container = new ModuleContainer();
        }

        vi.spyOn(console, 'info').mockImplementation(() => { });
        vi.spyOn(console, 'warn').mockImplementation(() => { });
        vi.spyOn(console, 'error').mockImplementation(() => { });
    });

    afterEach(() => {
        container.clear();
    })

    describe('метод registerModule()', () => {
        it('должен регистрировать модуль', () => {
            container.registerModule(MockModule);
            expect(container.hasModule(MockModule.name)).toBe(true);
        });

        it.each<[Scope]>([['request'], ['singleton'], ['transient']])(
            'должен регистрировать components с областью видимости %s',
            (scope) => {
                MockModule.__moduleConfig.components.push({ class: MockUseCase, scope });
                container.clear();
                container.registerModule(MockModule);
                container.registerAllComponents([MockModule.name]);
                expect(container.has(MockUseCase.name)).toBe(true);
            }
        );

        it('должен проверить зависимости модуля', () => {
            // Регистрируем существующий модуль
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

            // Создаём модуль, зависящий от существующего
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
            container.registerModule(InvalidModule);

            expect(console.warn).toHaveBeenCalledWith(
                '[ModuleContainer] Failed to read module, skipping module registration...',
                expect.any(Error)
            );
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
            expect(ModuleMetadata.getName(module)).toBe('TestModule');
            expect(ModuleMetadata.isEnabled(module)).toBe(true);
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
                    components: [
                        { class: class UseCase1 { static __componentConfig = {} }, scope: 'request' as Scope },
                        { class: class UseCase2 { static __componentConfig = {} }, scope: 'request' as Scope }
                    ],
                    repositories: [],
                    services: [],
                    dependencies: [],
                    enabled: true,
                    config: null,
                };
            }

            container.registerModule(TestModule);
            container.registerAllComponents([TestModule.name])
            const components = container.getComponentsByModule('TestModule')!;
            expect(components.length).toBe(2);
        });

        it('должен возвращать пустой массив для незарегистрированного модуля', () => {
            const components = container.getComponentsByModule('NonExistentModule');
            expect(components).toEqual([]);
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
        it('должен очищать все контейнеры', () => {
            class TestModule {
                static name = 'TestModule';
                static __moduleConfig = {
                    name: TestModule.name,
                    description: '',
                    version: '1.0.0',
                    components: [
                        { class: class UseCase1 { static __componentConfig = {} }, scope: 'request' },
                        { class: class UseCase2 { static __componentConfig = {} }, scope: 'request' }
                    ],
                    enabled: true,
                    config: null,
                };
            }

            container.registerModule(TestModule);
            container.registerAllComponents([TestModule.name]);

            expect(container.hasModule('TestModule')).toBe(true);
            expect(container.has('UseCase1')).toBe(true);
            expect(container.has('UseCase2')).toBe(true);

            container.clear();

            expect(container.hasModule('TestModule')).toBe(false);
            expect(container.has('UseCase1')).toBe(false);
            expect(container.has('UseCase2')).toBe(false);
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

    describe('Обработка областей видимости (Scope)', () => {
        it('должен регистрировать UseCase как request scope', () => {
            class TestModule {
                static name = 'TestModule';
                static __moduleConfig = {
                    name: TestModule.name,
                    components: [{ class: class UseCaseWithScope { static __componentConfig = {} }, scope: 'request' }]
                };
            }

            container.registerModule(TestModule);
            container.registerAllComponents([TestModule.name]);
            expect(container.has('UseCaseWithScope')).toBe(true);
        });
    });
});