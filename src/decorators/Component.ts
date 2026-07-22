import type { Scope } from "@/types";
import { moduleComponentsRegistry } from './Module';

export const COMPONENT_CONFIG_KEY = "__componentConfig";

export interface ComponentConfig {
    name: string;
    scope: Scope;
    lazy: boolean;
    module?: string;
    dependencies: string[];
}

export const componentRegistry = new Map<string, any>();

export function Component(config: Partial<ComponentConfig> = {}) {
    return function (target: any) {
        const name = config.name || target.name;
        const normalizeConfig: ComponentConfig = {
            name,
            lazy: config.lazy ?? false,
            module: config.module,
            scope: config.scope || 'request',
            dependencies: config.dependencies || []
        };

        Object.defineProperty(target, COMPONENT_CONFIG_KEY, {
            value: normalizeConfig,
            configurable: false,
            enumerable: false,
            writable: false,
        });

        componentRegistry.set(name, target);

        if (config.module) {
            if (!moduleComponentsRegistry.has(config.module)) {
                moduleComponentsRegistry.set(config.module, new Set());
            }

            moduleComponentsRegistry.get(config.module)?.add(name);
        }

        return target;
    };
}

export const ComponentMetadata = {
    isComponent(target: any): target is Function & { [COMPONENT_CONFIG_KEY]: ComponentConfig } {
        if (!target) {
            return false;
        }

        if (typeof target === 'function') {
            return Object.hasOwn(target, COMPONENT_CONFIG_KEY);
        }

        if (typeof target === 'object' && target.type) {
            return true;
        }

        return false;
    },

    _getValue<K extends keyof ComponentConfig>(target: any, key: K): ComponentConfig[K] | undefined {
        if (this.isComponent(target)) {
            return target[COMPONENT_CONFIG_KEY][key];
        }
        return;
    },

    getName(target: any) {
        if (target && typeof target === 'object' && target.type) {
            return target.name || 'Unknown';
        }
        return this._getValue(target, 'name') ?? 'Unknown';
    },

    getScope(target: any) {
        if (target && typeof target === 'object' && target.type) {
            return target.scope || 'request';
        }
        return this._getValue(target, 'scope') ?? 'request';
    },

    getDependencies(target: any) {
        if (target && typeof target === 'object' && target.type) {
            return target.dependencies || [];
        }
        return this._getValue(target, 'dependencies') ?? [];
    },

    isLazy(target: any) {
        return this._getValue(target, 'lazy') ?? false;
    },
}
