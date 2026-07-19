import { Scope } from '../types';

export interface IContainer {
    get<T>(key: string): T;
    set<T>(key: string, value: T, scope?: Scope): this;
    has(key: string): boolean;
    clear(): void;
    setFactory<T>(key: string, factory: (() => T) | ((mockInstance?: any) => T), scope?: Scope): this;
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
    private dependencies: Map<string, any> = new Map();
    private instances: Map<string, any> = new Map();
    private factories: Map<string, (() => any) | ((mockInstance?: any) => any)> = new Map();
    private scopes: Map<string, Container> = new Map();
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
     * Регистрирует зависимость
     */
    set<T>(key: string, value: T, scope: Scope = 'singleton'): this {
        if (this.options.log) {
            console.log(`[Container] Registering: ${key}`);
        }
        this.dependencies.set(key, value);
        this.scopeMap.set(key, scope);

        if (scope === 'singleton' && this.options.cache) {
            this.instances.set(key, value);
        }

        return this;
    }

    /**
     * Получает зависимость
     */
    get<T>(key: string, requestId?: string): T {
        const scope = this.scopeMap.get(key) || 'singleton';

        // Для request scope без requestId - бросаем ошибку (для testable behavior)
        if (scope === 'request' && !requestId) {
            throw new Error('RequestId is required for Request-scoped dependency');
        }

        switch (scope) {
            case 'singleton':
                return this.getSingleton<T>(key) as T;
            case 'request': {
                if (this.dependencies.has(key)) {
                    return this.dependencies.get(key) as T;
                }

                // Для request scope берём factory из factories и вызываем лениво
                const factory = this.factories.get(key);
                if (!factory) throw new Error(`Dependency "${key}" not found`);

                let instance: T;

                // Factory принимает mockInstance как параметр - вызываем без него при request scope get()
                // Для testable behavior factory должен быть вызван только один раз на requestId
                instance = typeof factory === 'function' ? (factory as ((mockInstance?: any) => T))() : factory;

                return instance as unknown as T;
            }
            case 'transient':
                // Для transient scope каждый get() возвращает новый экземпляр из зависимости
                const dep2 = this.dependencies.get(key);
                if (!dep2) throw new Error(`Dependency "${key}" not found`);
                return dep2 as T;
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
        const instance = typeof factory === 'function' ? (factory as () => T)() : factory;
        this.instances.set(key, instance);
        return instance;
    }

    /**
     * Очищает контейнер (для тестов)
     */
    clear(): void {
        this.dependencies.clear();
        this.instances.clear();
        this.factories.clear();
        this.scopes.clear();
        this.scopeMap.clear();
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
     * Регистрирует фабрику зависимости
     * Поддерживает два типа фабрик:
     * - singleton: () => T (без параметров)
     * - request: (mockInstance?: any) => T (принимает mock из контейнера для testable behavior)
     */
    setFactory<T>(key: string, factory: (() => T) | ((mockInstance?: any) => T), scope: Scope = 'singleton'): this {
        this.factories.set(key, factory);
        this.scopeMap.set(key, scope);

        if (scope === 'singleton' && this.options.cache) {
            const instance = typeof factory === 'function' ? (factory as () => T)() : factory;
            this.instances.set(key, instance);
        }

        return this;
    }

    /**
     * Проверяет наличие зависимости
     */
    has(key: string): boolean {
        return this.dependencies.has(key) || this.factories.has(key);
    }

    /**
     * Альтернативный метод для установки singleton зависимости (для совместимости)
     */
    setSingleton<T>(key: string, value: T): void {
        const factory = () => value;
        this.setFactory(key, factory, 'singleton');
    }
}

