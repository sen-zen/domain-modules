import type { Type, Scope } from '../types';
import type { ComponentConfig } from './Component';

export const MODULE_CONFIG_KEY = '__moduleConfig';

export interface ModuleConfig extends Omit<ComponentConfig, 'lazy' | 'scope'> {
    /** Описание модуля */
    description?: string;

    /** Версия модуля */
    version: string;

    /** Component'ы модуля */
    components: (string | Type<any> | { class: Type<any>; scope?: Scope })[];

    /** Включен ли модуль */
    enabled: boolean;
}

export const moduleRegistry = new Map<string, any>();

export const moduleComponentsRegistry = new Map<string, Set<string>>();

export function Module(config: Partial<ModuleConfig>) {
    return function <T extends { new(...args: any[]): any }>(target: T) {
        const name = config.name || target.name;
        const normalizeConfig: ModuleConfig = {
            name,
            description: config.description,
            version: config.version || '1.0.0',
            components: config.components || [],
            dependencies: config.dependencies || [],
            enabled: config.enabled !== false,
        }

        Object.defineProperty(target, MODULE_CONFIG_KEY, {
            value: normalizeConfig,
            configurable: false,
            enumerable: false,
            writable: false,
        });

        moduleRegistry.set(name, target);

        return target;
    };
}

export const ModuleMetadata = {
    isModule(target: any): target is Function & { [MODULE_CONFIG_KEY]: ModuleConfig } {
        if (!target || typeof target !== 'function') {
            return false;
        }
        return Object.hasOwn(target, MODULE_CONFIG_KEY) && target[MODULE_CONFIG_KEY] !== undefined;
    },

    _getValue<K extends keyof ModuleConfig>(target: any, key: K) {
        if (this.isModule(target) && typeof target[MODULE_CONFIG_KEY][key] !== undefined) {
            return target[MODULE_CONFIG_KEY][key];
        }
        return;
    },

    getName(target: any) {
        return this._getValue(target, 'name') ?? 'Unknown';
    },

    getDependencies(target: any): string[] {
        return this._getValue(target, 'dependencies') ?? [];
    },

    getComponents(target: any) {
        return this._getValue(target, 'components') ?? [];
    },

    isEnabled(target: any) {
        return this._getValue(target, 'enabled') ?? false;
    },

    getVersion(target: any) {
        return this._getValue(target, 'version') ?? '1.0.0';
    },
};
