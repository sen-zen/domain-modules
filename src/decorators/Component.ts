import { Scope } from "../types";

export const COMPONENT_CONFIG_KEY = "__componentConfig";

export interface ComponentConfig {
    name?: string;
    scope?: Scope;
    dependencies?: string[];
}

export function Component(config: ComponentConfig) {
    return function (target: any) {
        Object.defineProperty(target, COMPONENT_CONFIG_KEY, {
            value: {
                name: config.name || target.name,
                scope: config.scope || 'request',
                dependencies: config.dependencies || []
            },
            configurable: false,
            enumerable: false,
            writable: false,
        });

        return target;
    };
}

export const ComponentMetadata = {
    isComponent(target: any): target is Function & { [COMPONENT_CONFIG_KEY]: ComponentConfig } {
        if (!target || typeof target !== 'function') {
            return false;
        }
        return Object.hasOwn(target, COMPONENT_CONFIG_KEY) && target[COMPONENT_CONFIG_KEY] !== undefined;
    },

    _getValue<K extends keyof ComponentConfig>(target: any, key: K): ComponentConfig[K] | undefined {
        if (this.isComponent(target)) {
            return target[COMPONENT_CONFIG_KEY][key];
        }
        return;
    },

    getName(target: any) {
        return this._getValue(target, 'name') ?? 'Unknown';
    },

    getScope(target: any) {
        return this._getValue(target, 'scope') ?? 'request';
    },

    getDependencies(target: any) {
        return this._getValue(target, 'dependencies') ?? [];
    },
}

