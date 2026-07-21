import { AsyncLocalStorage } from 'async_hooks';
import type {
    Scope,
    CompatibleWith,
    ComponentRegistry
} from '../types';

export interface IContainer {
    get<K extends keyof ComponentRegistry>(key: K): ComponentRegistry[K];
    get<T>(key: string): T;

    set<K extends keyof ComponentRegistry>(key: K, value: CompatibleWith<any, ComponentRegistry[K]>, scope?: Scope): this;
    set<T>(key: string, value: T, scope?: Scope): this;

    setFactory<K extends keyof ComponentRegistry>(key: K, factory: () => ComponentRegistry[K], scope?: Scope): this;
    setFactory<T>(key: string, factory: () => T, scope?: Scope): this;

    has(key: string): boolean;

    clear(): void;
}

export interface ContainerOptions {
    /** Включить логирование */
    log?: boolean;
    /** Включить кеширование экземпляров */
    cache?: boolean;
    /** Автоматическое разрешение зависимостей */
    autowire?: boolean;
}

export class Container implements IContainer {
    private static asyncLocalStorage = new AsyncLocalStorage<Map<string, any>>();

    private dependencies: Map<string, any> = new Map();
    private instances: Map<string, any> = new Map();
    private factories: Map<string, () => any> = new Map();
    private scopeMap: Map<string, Scope> = new Map();

    private options: ContainerOptions;

    constructor(options: ContainerOptions = {}) {
        this.options = {
            log: false,
            cache: true,
            autowire: false,
            ...options,
        };
    }

    /**
     * Выполняет функцию в контексте запроса
     */
    runInRequestScope<T>(fn: () => T): T {
        return Container.asyncLocalStorage.run(new Map(), fn);
    }

    /**
     * Регистрирует фабрику зависимости
     */
    setFactory<K extends keyof ComponentRegistry>(key: K, factory: () => ComponentRegistry[K], scope?: Scope): this;
    setFactory<T>(key: string, factory: () => T, scope?: Scope): this;
    setFactory<T>(key: string, factory: () => T, scope: Scope = 'singleton'): this {
        this.factories.set(key, factory);
        this.scopeMap.set(key, scope);

        if (scope === 'singleton' && this.options.cache) {
            const instance = typeof factory === 'function'
                ? (factory as () => T)()
                : factory;

            this.instances.set(key, instance);
        }

        return this;
    }

    /**
     * Регистрирует зависимость
     */
    set<K extends keyof ComponentRegistry>(key: K, value: CompatibleWith<any, ComponentRegistry[K]>, scope?: Scope): this;
    set<T>(key: string, value: T, scope?: Scope): this;
    set<T>(key: string, value: T, scope: Scope = 'singleton'): this {
        if (this.options.log) {
            console.log(`[Container] Registering: ${key}`);
        }

        if (scope === 'singleton') {
            this.dependencies.set(key, value);
            if (this.options.cache) {
                this.instances.set(key, value);
            }
        } else {
            this.factories.set(key, () => value);
        }

        this.scopeMap.set(key, scope);

        return this;
    }

    /**
     * Получает зависимость
     */
    get<K extends keyof ComponentRegistry>(key: K): ComponentRegistry[K];
    get<T>(key: string): T;
    get<T>(key: string): T {
        const scope = this.scopeMap.get(key) || 'singleton';

        switch (scope) {
            case 'singleton': {
                return this.getSingleton<T>(key);
            }

            case 'request': {
                const cache = this.getRequestCache();
                if (!cache) {
                    throw new Error(
                        'Request-scoped dependency accessed outside of request context. ' +
                        'Use container.runInRequestScope() to create a request context.'
                    );
                }

                if (cache.has(key)) {
                    return cache.get(key);
                }

                const factory = this.factories.get(key);
                if (!factory) {
                    throw new Error(`Dependency "${key}" not found`);
                }

                const instance = factory();
                cache.set(key, instance);
                return instance;
            }

            case 'transient': {
                const factory = this.factories.get(key);
                if (!factory) {
                    throw new Error(`Dependency "${key}" not found`);
                }

                return factory();
            }

            default: {
                throw new Error(`Unknown scope: ${scope}`);
            }
        }
    }

    /**
     * Получает singleton зависимость с кэшированием
     */
    private getSingleton<T>(key: string): T {
        if (this.instances.has(key)) {
            return this.instances.get(key)!;
        }

        const factory = this.factories.get(key) || this.dependencies.get(key);
        if (!factory) {
            throw new Error(`Dependency "${key}" not found`);
        }

        // Для singleton scope сразу вызываем фабрику и кэшируем результат
        const instance = typeof factory === 'function'
            ? (factory as () => T)()
            : factory;

        this.instances.set(key, instance);
        return instance;
    }

    /**
     * Получает кеш текущего запроса
     */
    private getRequestCache(): Map<string, any> | undefined {
        return Container.asyncLocalStorage.getStore();
    }

    /**
     * Очищает контейнер (для тестов)
     */
    clear(): void {
        this.dependencies.clear();
        this.instances.clear();
        this.factories.clear();
        this.scopeMap.clear();
    }

    clearRequestScope(): void {
        for (const [key, scope] of this.scopeMap) {
            if (scope === 'request') {
                this.dependencies.delete(key);
            }
        }
    }

    /**
     * Создает дочерний контейнер
     */
    createChild(): Container {
        const child = new Container(this.options);

        // Копируем зависимости
        for (const [key, value] of this.dependencies) {
            const scope = this.scopeMap.get(key) || 'singleton';
            child.set(key, value, scope);
        }

        // Копируем factories
        for (const [key, factory] of this.factories) {
            const scope = this.scopeMap.get(key) || 'singleton';
            child.setFactory(key, factory, scope);
        }

        return child;
    }

    /**
     * Объединяет с другим контейнером
     */
    merge(other: Container): this {
        for (const [key, value] of other.dependencies) {
            const scope = other.scopeMap.get(key) || 'singleton';
            this.set(key, value, scope);
        }
        return this;
    }

    /**
     * Проверяет наличие зависимости
     */
    has(key: string): boolean {
        return this.dependencies.has(key) ||
            this.factories.has(key) ||
            this.instances.has(key);
    }
}
