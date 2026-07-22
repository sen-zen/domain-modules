import { DependencyGraph } from './DependencyGraph';
import { Container, type ContainerOptions } from './Container';
import { moduleRegistry, ModuleMetadata, moduleComponentsRegistry } from '@/decorators/Module';
import { componentRegistry, ComponentMetadata } from '@/decorators/Component';
import type { Scope, ComponentRegistry } from "@/types";

export interface ModuleInfo {
    name: string;
    class: any;
    components: any[];
    dependencies: string[];
    enabled: boolean;
    version: string;
    config?: Record<string, any> | null;
}

export interface ModuleItem<T = any> {
    class: T;
    scope?: Scope;
    config?: Record<string, any>;
    dependencies?: string[];
    lazy?: boolean;
}

/**
 * Контейнер модулей - управляет регистрацией и разрешением модулей
 */
export class ModuleContainer {
    private static instance: ModuleContainer;
    private container: Container;
    private options: ContainerOptions;

    constructor(options: ContainerOptions = {}) {
        this.options = {
            log: false,
            cache: true,
            ...options
        }

        this.container = new Container(this.options);
    }

    static getInstance(): ModuleContainer {
        if (!ModuleContainer.instance) {
            ModuleContainer.instance = new ModuleContainer();
        }
        return ModuleContainer.instance;
    }

    /**
     * Регистрирует зависимость
     */
    register<T>(key: string, value: T, scope: Scope): this {
        this.container.set(key, value, scope);
        return this;
    }

    /**
     * Регистрирует фабрику
     */
    registerFactory<T>(key: string, factory: () => T, scope: Scope = 'singleton'): this {
        this.container.setFactory(key, factory, scope);
        return this;
    }

    /**
     * Автоматически регистрирует все модули из глобального реестра
     */
    registerAllModules(): void {
        const graph = new DependencyGraph();

        if (this.options.log) {
            console.info(`[ModuleContainer] Автоматически регистрирует все Modules из реестра`);
        }

        for (const [name, target] of moduleRegistry) {
            const dependencies = ModuleMetadata.getDependencies(target);

            graph.addNode({
                name,
                class: target,
                dependencies: dependencies,
            });
        }

        for (const node of graph.sort()) {
            this.registerModule(node.class);
        }
    }

    /**
     * Регистрирует модуль
     */
    registerModule = (moduleClass: any) => {
        const name = ModuleMetadata.getName(moduleClass);
        const moduleDependencies = ModuleMetadata.getDependencies(moduleClass);

        if (this.options.log) {
            console.info(`[ModuleContainer] 📦 Регистрация модуля: ${name}`);
        }

        try {
            for (const moduleDep of moduleDependencies) {
                if (!moduleRegistry.has(moduleDep)) {
                    throw new Error(
                        `Module "${name}" depends on module "${moduleDep}" which is not registered. ` +
                        `Please ensure "${moduleDep}" is imported before "${name}".`
                    );
                }
            }

            if (!moduleRegistry.has(name)) {
                moduleRegistry.set(name, moduleClass);
            }

            if (!moduleComponentsRegistry.has(name)) {
                moduleComponentsRegistry.set(name, new Set());
            }

            const components = ModuleMetadata.getComponents(moduleClass);
            for (const component of components) {
                let componentName;
                let componentClass;

                if (typeof component === 'string') {
                    componentName = component
                } else if (typeof component === "object" && Object.hasOwn(component, 'class')) {
                    componentClass = component.class;
                    componentName = ComponentMetadata.getName(component.class);
                } else if (typeof component === 'function' && ComponentMetadata.isComponent(component)) {
                    componentClass = component;
                    componentName = ComponentMetadata.getName(component);
                }

                moduleComponentsRegistry.get(name)!.add(componentName);

                if (ComponentMetadata.isComponent(componentClass) && !componentRegistry.has(componentName)) {
                    componentRegistry.set(componentName, componentClass);
                }
            }
        } catch (error) {
            console.warn(`[ModuleContainer] Failed to read module, skipping module registration...`, error);
        }
    }

    /**
     * Регистрация компонентов (экземпляры)
     */
    registerAllComponents(
        modules: string[] = Array.from(moduleRegistry.keys()),
        options: { includeGlobal?: boolean } = {}
    ): void {
        const graph = new DependencyGraph();
        const componentNames = new Set<string>(
            options.includeGlobal ? componentRegistry.keys() : []
        );

        if (this.options.log) {
            console.info(`[ModuleContainer] Автоматически регистрирует все Components из реестра`);
        }

        for (const moduleName of modules) {
            if (!moduleRegistry.has(moduleName)) {
                console.warn(`[ModuleContainer] Module "${moduleName}" not found, skipping...`);
                continue;
            }

            const names = moduleComponentsRegistry.get(moduleName);
            if (!names) {
                continue;
            }

            for (const name of names) {
                if (!componentRegistry.has(name)) {
                    console.warn(`[ModuleContainer] Component "${name}" from module "${moduleName}" not found in registry, skipping...`);
                    continue;
                }
                componentNames.add(name);
            }
        }

        for (const name of componentNames) {
            const target = componentRegistry.get(name);
            const dependencies = ComponentMetadata.getDependencies(target);

            if (!target) {
                console.warn(`[ModuleContainer] Component "${name}" not found in registry, skipping...`);
                continue;
            }

            graph.addNode({
                name,
                class: target,
                dependencies: dependencies,
            });
        }

        for (const node of graph.sort()) {
            this.registerComponent(node.class);
        }
    }

    /**
     * Регистрирует компонент
     */
    registerComponent(component: any) {
        const componentName = ComponentMetadata.getName(component);
        const componentScope = ComponentMetadata.getScope(component);
        const componentDependencies = ComponentMetadata.getDependencies(component);

        if (this.container.has(componentName)) {
            if (this.options.log) {
                console.warn(`[ModuleContainer] "${componentName}" already registered, skipping...`);
            }
            return;
        }

        if (this.options.log) {
            console.info(`[ModuleContainer] 📦 Регистрация компонента: ${componentName}`);
        }

        try {
            this.container.setFactory(
                componentName,
                () => {
                    const resolvedDeps = componentDependencies.map(n => this.container.get(n));
                    return new component(...resolvedDeps);
                },
                componentScope
            );

            if (!componentRegistry.has(componentName)) {
                componentRegistry.set(componentName, component);
            }
        } catch (error) {
            console.warn(`[ModuleContainer] "${componentName}" failed to read metadata, skipping module registration...`, error);
        }
    }

    /**
     * Регистрирует фабрику зависимости в контейнера
     */
    setFactory<K extends keyof ComponentRegistry>(key: K, factory: () => ComponentRegistry[K], scope: Scope): this;
    setFactory<T>(key: string, factory: () => T, scope: Scope): this;
    setFactory<T>(key: string, factory: () => T, scope: Scope = 'singleton'): this {
        this.container.setFactory(key, factory, scope);
        return this;
    }

    /**
     * Получает зависимость из контейнера
     */
    get<K extends keyof ComponentRegistry>(key: K): ComponentRegistry[K];
    get<T>(key: string): T;
    get<T>(key: string): T {
        return this.container.get<T>(key);
    }

    /**
     * Проверяет наличие зависимости
     */
    has(key: string): boolean {
        return this.container.has(key);
    }

    /**
     * Проверяет, зарегистрирован ли модуль
     */
    hasModule(name: string) {
        return moduleRegistry.has(name);
    }

    /**
     * Возвращает все модули
     */
    getAllModules() {
        return moduleRegistry;
    }

    /**
     * Получает модуль
     */
    getModule(moduleName: string) {
        return moduleRegistry.get(moduleName);
    }

    /**
     * Получает все имена Components по модулю
     */
    getComponentsByModule(moduleName: string): readonly string[] {
        const components = moduleComponentsRegistry.get(moduleName);
        return components ? [...components] : [];
    }

    /**
     * Возвращает Components по имени
     */
    getComponent<T>(name: string) {
        return this.container.get<T>(name);
    }

    runInRequestScope<T>(fn: () => T) {
        return this.container.runInRequestScope<T>(fn);
    }

    /**
     * Очищает все модули (для тестов)
     */
    clear(): void {
        this.container.clear();

        moduleRegistry.clear();
        componentRegistry.clear();
        moduleComponentsRegistry.clear();
    }
}

export const moduleContainer = ModuleContainer.getInstance();
