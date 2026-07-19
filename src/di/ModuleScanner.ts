import { ModuleMetadata } from '../decorators/Module';
import { ModuleContainer } from './ModuleContainer';
import { DependencyGraph } from './DependencyGraph';
import type { Type } from '../types';

export interface ScanResult {
    readonly modulesCount: number;
    readonly failedModules: string[];
    readonly registeredModules: string[];
}

export interface ScannerOptions {
    log?: boolean;
    pattern?: RegExp;
}

/**
 * Сканирует директорию и находит модули для авто-регистрации в контейнере
 */
export class ModuleScanner {
    private static __instance: ModuleScanner | null = null;

    private container: ModuleContainer;
    private modules: Map<string, any> = new Map();
    private options: ScannerOptions;
    private failed: string[] = [];

    constructor(container: ModuleContainer, options: ScannerOptions = {}) {
        this.container = container;
        this.options = {
            log: false,
            pattern: /\.module\.(ts|js)$/,
            ...options,
        };
    }

    /**
     * Получает singleton scanner для текущего контейнера
     */
    static getInstance(container: ModuleContainer): ModuleScanner {
        if (!ModuleScanner.__instance) {
            ModuleScanner.__instance = new ModuleScanner(container);
        }
        return ModuleScanner.__instance;
    }

    /**
     * Сброс singleton (для тестов)
     */
    static resetInstance(): void {
        ModuleScanner.__instance = null;
    }

    /**
     * Сканирует директорию и находит модули
     * Возвращает this для цепочки вызовов (chainable API)
     */
    async scan(directory: string): Promise<ModuleScanner> {
        this.modules.clear();
        this.failed = [];

        if (!this.container) {
            if (this.options.log) {
                console.warn('[ModuleScanner] No container, skipping scan');
            }
            return this;
        }

        try {
            const fs = await import('node:fs/promises');
            const path = await import('node:path');
            const entries = await fs.readdir(directory, { withFileTypes: true });

            const moduleFiles = entries
                .filter((entry) => entry.isFile() && this.options.pattern?.test(entry.name))
                .map(entry => path.join(directory, entry.name));

            if (this.options.log) {
                console.info(`Found ${moduleFiles.length} module files`);
            }

            if (moduleFiles.length === 0) {
                console.error('No modules found');
                return this;
            }

            const modules = await this.loadModules(moduleFiles);

            if (modules.length === 0) {
                console.warn('No valid modules found');
                return this;
            }

            const sortedModules = this.sortModules(modules);

            for (const moduleClass of sortedModules) {
                this.registerModule(moduleClass);
            }

            if (this.options.log) {
                console.warn(`[ModuleScanner] Found ${this.modules.size} modules, ${this.failed.length} failed`);
            }

            return this;
        } catch (error: any) {
            console.error('[ModuleScanner] Scan failed:', error);
            return this;
        }
    }

    private async loadModules(files: string[]): Promise<any[]> {
        const modules: any[] = [];

        for (const file of files) {
            try {
                const moduleExports = await import(file);

                for (const value of Object.values(moduleExports)) {
                    if (typeof value === 'function' && ModuleMetadata.isModule(value)) {
                        modules.push(value);
                    }
                }
            } catch (error) {
                this.failed.push(file);
                console.warn(`Failed to load ${file}: ${error}`);
            }
        }

        return modules;
    }

    /**
     * Сортирует модули по зависимостям (топологическая сортировка)
     */
    private sortModules(modules: any[]): any[] {
        if (!modules || modules.length === 0) {
            console.warn('No modules to sort');
            return [];
        }

        const graph = new DependencyGraph();

        for (const module of modules) {
            if (ModuleMetadata.isModule(module)) {
                const name = ModuleMetadata.getName(module);
                const dependencies = ModuleMetadata.getDependencies(module);

                graph.addNode(module, name, dependencies);
            }
        }

        const sorted = graph.sort();

        if (this.options.log) {
            const order = sorted.map(m => ModuleMetadata.getName(m));
            console.warn(`[ModuleScanner] Registration order: ${order.join(' → ')}`);
        }

        return sorted;
    }

    /**
     * Регистрирует модуль
     */
    registerModule(moduleClass: any): void {
        if (!this.container) {
            return;
        }

        if (!ModuleMetadata.isModule(moduleClass)) {
            if (this.options.log) {
                console.warn(`[ModuleScanner] Module is not Metadat`);
            }
            return;
        }

        const moduleName = ModuleMetadata.getName(moduleClass);
        if (!moduleName) {
            return;
        }

        if (this.modules.has(moduleName)) {
            if (this.options.log) {
                console.warn(`[ModuleScanner] Module "${moduleName}" already registered, skipping`);
            }
            return;
        }


        try {
            this.container.registerModule(moduleClass);
            this.modules.set(moduleName, moduleClass);

            if (this.options.log) {
                console.info(`[ModuleScanner] Registered module: ${moduleName}`);
            }
        } catch (error) {
            this.failed.push(moduleName);
            console.warn(`[ModuleScanner] Failed to register module "${moduleName}":`, error);
        }
    }

    /**
     * Регистрирует несколько модулей
     */
    registerModules(modules: Record<string, Type<any>>): void {
        for (const [_name, moduleClass] of Object.entries(modules)) {
            this.registerModule(moduleClass);
        }
    }

    /**
     * Получает зарегистрированные модули
     */
    getModules(): Map<string, Type<any>> {
        return new Map(this.modules);
    }

    getResult(): ScanResult {
        return {
            modulesCount: this.modules.size,
            failedModules: this.failed,
            registeredModules: Array.from(this.modules.keys()),
        };
    }

    /**
     * Проверяет наличие модуля
     */
    hasModule(name: string): boolean {
        return this.modules.has(name);
    }

    /**
     * Очищает все модули (для тестов)
     */
    clear(): void {
        this.modules.clear();
        this.failed = [];

        if (this.container) {
            this.container.clear();
        }
    }
}
