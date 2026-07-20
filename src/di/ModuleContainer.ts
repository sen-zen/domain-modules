import { Container, type ContainerOptions } from './Container';
import { ComponentMetadata } from '@/decorators/Component';
import { ModuleMetadata } from '@/decorators/Module';
import { Scope } from "@/types";

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
    private modules: Map<string, ModuleInfo> = new Map();
    private container: Container;

    constructor(options: ContainerOptions = {}) {
        this.container = new Container({
            log: false,
            cache: true,
            ...options
        });
    }

    static getInstance(): ModuleContainer {
        if (!ModuleContainer.instance) {
            ModuleContainer.instance = new ModuleContainer();
        }
        return ModuleContainer.instance;
    }

    /**
     * Регистрирует зависимость (для Scanner)
     */
    register<T>(key: string, value?: T): void {
        try {
            this.container.setSingleton(key, value || (() => null));
        } catch (error) {
            console.warn(`[ModuleContainer] Failed to register "${key}":`, error);
        }
    }

    /**
     * Регистрирует модуль с декораторами или тестовыми метаданными
     */
    registerModule = (moduleClass: any) => {
        const name = ModuleMetadata.getName(moduleClass);
        const components = ModuleMetadata.getComponents(moduleClass);
        const dependencies = ModuleMetadata.getDependencies(moduleClass);
        const enabled = ModuleMetadata.isEnabled(moduleClass);
        const version = ModuleMetadata.getVersion(moduleClass);
        const config = ModuleMetadata.getConfig(moduleClass);

        try {
            for (const dep of dependencies) {
                if (!this.modules.has(dep)) {
                    throw new Error(`Module "${name}" depends on "${dep}" which is not registered`);
                }
            }

            this.modules.set(name, {
                class: moduleClass,
                name,
                components,
                dependencies,
                enabled,
                version,
                config
            });

            for (const component of components) {
                this.registerComponent(component);
            }
        } catch (error) {
            // Если декораторы недоступны или ошибка чтения метаданных - игнорируем
            if ((error as Error).message?.includes('Metadata')) {
                console.warn(`[ModuleContainer] Failed to read metadata, skipping module registration...`);
            } else {
                throw error;
            }
        }
    }

    registerComponent(component: any = {}) {
        const componentClass = component.class || component;
        const componentName = ComponentMetadata.getName(componentClass);

        if (this.container.has(componentName)) {
            console.warn(`[ModuleContainer] "${componentName}" already registered, skipping...`);
            return;
        }

        try {
            const scope = component.scope || ComponentMetadata.getScope(componentClass) || 'request';
            const dependencies = ComponentMetadata.getDependencies(componentClass);

            this.container.setFactory(componentName, () => {
                const resolvedDeps = dependencies.map((depName: string) => this.container.get(depName));
                return new componentClass(...resolvedDeps);
            }, scope as Scope);
        } catch (error) {
            console.warn(`[ModuleContainer] "${componentName}" failed to read metadata, skipping module registration...`, error);
        }
    }

    /**
     * Получает модуль
     */
    getModule(name: string): ModuleInfo | undefined {
        return this.modules.get(name);
    }

    /**
     * Получает зависимость из контейнера
     */
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
     * Возвращает все модули
     */
    getAllModules(): Map<string, ModuleInfo> {
        return this.modules;
    }

    /**
     * Получает все UseCase по модулю
     */
    getComponentsByModule(moduleName: string): any[] {
        const module = this.modules.get(moduleName);
        return module ? module.components : [];
    }

    /**
     * Возвращает UseCase по имени
     */
    getComponent<T>(name: string): T {
        return this.container.get<T>(name);
    }

    /**
     * Проверяет, зарегистрирован ли модуль
     */
    hasModule(name: string): boolean {
        return this.modules.has(name);
    }

    /**
     * Очищает все модули (для тестов)
     */
    clear(): void {
        this.modules.clear();
        this.container.clear();
    }
}

export const moduleContainer = ModuleContainer.getInstance();
