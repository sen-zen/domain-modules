import { ModuleMetadata } from '../decorators/Module';
import { ComponentMetadata } from '../decorators/Component';
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
    private options: Omit<ScannerOptions, 'pattern'> & { pattern: RegExp };
    private failed: string[] = [];
    private scannedDirs: Set<string> = new Set();

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
        this.failed = [];
        this.modules.clear();
        this.scannedDirs.clear();

        if (!this.container) {
            if (this.options.log) {
                console.warn('[ModuleScanner] No container, skipping scan');
            }
            return this;
        }

        try {
            const moduleFiles = await this.findFiles(directory, this.options.pattern, 1);

            if (this.options.log) {
                console.info(`Found ${moduleFiles.length} module files`);
            }

            if (moduleFiles.length === 0) {
                console.error('No modules found');
                return this;
            }

            const modules = await this.load(moduleFiles, ModuleMetadata.isModule);

            if (modules.length === 0) {
                console.warn('No valid modules found');
                return this;
            }

            const path = await import('node:path');
            const graph = new DependencyGraph();
            const componentDirs = new Set<string>();

            modules.forEach(({ module, moduleDir }) => {
                graph.addNode({
                    class: module,
                    name: ModuleMetadata.getName(module),
                    dependencies: ModuleMetadata.getDependencies(module)
                });

                const components = ModuleMetadata
                    .getComponents(module)
                    .filter(v => typeof v === "string")
                    .map(componentPath => path.join(moduleDir, componentPath));

                if (components.length) {
                    components.forEach(dir => componentDirs.add(dir));
                } else {
                    componentDirs.add(moduleDir);
                }
            });

            const sortedModules = graph.sort();

            for (const node of sortedModules) {
                this.registerModule(node.class);
            }

            const componentGraph = new DependencyGraph();

            const componentFiles = await this.findFiles(
                [...componentDirs].filter(dir => !this.scannedDirs.has(dir)),
                /\.(t|j)sx?$/, 5
            );

            const components = await this.load(componentFiles, ComponentMetadata.isComponent);

            components.forEach(({ module }) => {
                componentGraph.addNode({
                    class: module,
                    name: ComponentMetadata.getName(module),
                    dependencies: ComponentMetadata.getDependencies(module)
                });
            });

            if (this.options.log) {
                console.warn(`[ModuleScanner] Found ${components.length} components`);
            }

            const sortedComponent = componentGraph.sort();
            for (const node of sortedComponent) {
                this.registerComponent(node.class);
            }

            return this;
        } catch (error: any) {
            console.error('[ModuleScanner] Scan failed:', error);
            return this;
        }
    }

    /**
     * Находит все JS файлы (рекурсивно)
     */
    private async findFiles(
        dir: string | string[],
        pattern: RegExp,
        maxDepth: number = -1
    ): Promise<string[]> {
        const fs = await import('node:fs/promises');
        const path = await import('node:path');
        const files: string[] = [];
        const directories: { dir: string; depth: number }[] = Array.isArray(dir)
            ? dir.map((direcotory: string) => ({ dir: direcotory, depth: 0 }))
            : [{ dir, depth: 0 }];

        while (directories.length) {
            const current = directories.shift()!;

            if (maxDepth >= 0 && current.depth > maxDepth) {
                continue;
            }

            try {
                const entries = await fs.readdir(current.dir, { withFileTypes: true });

                for (const entry of entries) {
                    const fullPath = path.join(current.dir, entry.name);

                    if (entry.isDirectory() && (maxDepth === -1 || current.depth < maxDepth)) {
                        directories.push({
                            dir: fullPath,
                            depth: current.depth + 1
                        });
                    } else if (entry.isFile() && pattern.test(entry.name)) {
                        files.push(fullPath);
                    }
                }
            } catch (error) {
                console.warn(`[ModuleScanner][depth: ${current.depth}] Failed to read directory "${current.dir}":`, error);
            }
        }

        return files;
    }

    private async load(files: string[], isMetadata: (module: any) => boolean) {
        const path = await import('node:path');
        const modules: { module: any, moduleDir: string }[] = [];

        for (const file of files) {
            try {
                const moduleExports = await import(file);
                const moduleDir = path.dirname(file);

                for (const module of Object.values(moduleExports)) {
                    if (typeof module === 'function' && isMetadata(module)) {
                        modules.push({ module, moduleDir });
                    }
                }
            } catch (error) {
                this.failed.push(file);
                console.error(`Failed to load ${file}: ${error}`);
            }
        }

        return modules;
    }

    /**
     * Регистрирует модуль
     */
    registerModule(moduleClass: any) {
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
     * Регистрирует компоненты
     */
    registerComponent(componentClass: any) {
        if (!this.container) {
            return;
        }

        if (!ComponentMetadata.isComponent(componentClass)) {
            if (this.options.log) {
                console.warn(`[ModuleScanner] Module is not Metadat`);
            }
            return;
        }

        const componentName = ComponentMetadata.getName(componentClass);
        if (!componentName) {
            return;
        }

        if (this.container.has(componentName)) {
            if (this.options.log) {
                console.warn(`[ModuleScanner] Component "${componentName}" already registered, skipping`);
            }
            return;
        }


        try {
            const scope = ComponentMetadata.getScope(componentClass);
            const dependencies = ComponentMetadata.getDependencies(componentClass);

            this.container.registerComponent({
                class: componentClass,
                scope: scope,
                dependencies: dependencies,
            });

            if (this.options.log) {
                console.info(`[ModuleScanner] Registered component: ${componentName}`);
            }
        } catch (error) {
            this.failed.push(componentName);
            console.warn(`[ModuleScanner] Failed to register component "${componentName}":`, error);
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

    getContainer() {
        return this.container;
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
        this.failed = [];
        this.modules.clear();
        this.scannedDirs.clear();

        if (this.container) {
            this.container.clear();
        }
    }
}
