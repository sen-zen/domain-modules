import type { Container } from './Container';

export class UseCaseRegistry {
    private static useCases: Map<string, any> = new Map();

    /**
     * Регистрирует все UseCase из модулей
     */
    static async registerFromModules(modules: Map<string, any>): Promise<void> {
        for (const [name, module] of modules) {
            const useCases = Reflect.getMetadata('module:useCases', module.class) || [];

            for (const useCase of useCases) {
                const useCaseName = Reflect.getMetadata('useCase:name', useCase) || useCase.name;
                const moduleName = Reflect.getMetadata('useCase:module', useCase) || name;

                if (this.useCases.has(useCaseName)) {
                    throw new Error(`Duplicate UseCase name: ${useCaseName}`);
                }

                this.useCases.set(useCaseName, {
                    class: useCase,
                    module: moduleName,
                    instance: null,
                    config: {
                        cache: Reflect.getMetadata('useCase:cache', useCase),
                        timeout: Reflect.getMetadata('useCase:timeout', useCase),
                        tags: Reflect.getMetadata('useCase:tags', useCase) || [],
                    },
                });
            }
        }
    }

    /**
     * Получает UseCase (с кешированием экземпляра)
     */
    static get<T>(name: string, container: Container): T {
        const meta = this.useCases.get(name);

        if (!meta) {
            throw new Error(`UseCase "${name}" not found`);
        }

        // ✅ Ленивая инициализация
        if (!meta.instance) {
            const deps = Reflect.getMetadata('design:paramtypes', meta.class) || [];
            const instances = deps.map((dep: any) => container.get(dep.name));
            meta.instance = new meta.class(...instances);
        }

        return meta.instance as T;
    }

    /**
     * Возвращает все UseCase по тегу
     */
    static getByTag(tag: string): string[] {
        const result: string[] = [];

        for (const [name, meta] of this.useCases) {
            if (meta.config.tags.includes(tag)) {
                result.push(name);
            }
        }

        return result;
    }
}
