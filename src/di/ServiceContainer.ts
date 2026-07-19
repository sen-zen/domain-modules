import { Container, ContainerOptions } from './Container';

/**
 * Контейнер для сервисов с поддержкой скоупов
 */
export class ServiceContainer {
    private static instance: ServiceContainer;
    private containers: Map<string, Container> = new Map();
    private rootContainer: Container;
    private options: ContainerOptions;

    private constructor(options: ContainerOptions = {}) {
        this.options = options;
        this.rootContainer = new Container(this.options);
        this.containers.set('root', this.rootContainer);
    }

    static getInstance(): ServiceContainer {
        if (!ServiceContainer.instance) {
            ServiceContainer.instance = new ServiceContainer();
        }
        return ServiceContainer.instance;
    }

    /**
     * Создает новый скоуп
     */
    createScope(name: string): Container {
        const scope = this.rootContainer.createChild();
        this.containers.set(name, scope);
        return scope;
    }

    /**
     * Получает контейнер по скоупу
     */
    getScope(name: string): Container {
        if (!this.containers.has(name)) {
            throw new Error(`Scope "${name}" not found`);
        }
        return this.containers.get(name)!;
    }

    /**
     * Получает зависимость из root контейнера
     */
    get<T>(key: string): T {
        return this.rootContainer.get<T>(key);
    }

    /**
     * Удаляет скоуп
     */
    removeScope(name: string): void {
        this.containers.delete(name);
    }

    /**
     * Очищает все контейнеры
     */
    clear(): void {
        this.containers.clear();
        this.rootContainer = new Container(this.options);
        this.containers.set('root', this.rootContainer);
    }
}

