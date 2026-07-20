import type { Type, Scope } from '../types';
import type { ComponentConfig } from './Component';

export const MODULE_CONFIG_KEY = '__moduleConfig';

export interface ModuleConfig extends ComponentConfig {
    /** Описание модуля */
    description?: string;

    /** Версия модуля */
    version?: string;

    /** UseCase'ы модуля */
    components?: (Type<any> | { class: Type<any>; scope?: Scope })[];

    /** Включен ли модуль */
    enabled?: boolean;

    /** Конфигурация модуля */
    config?: Record<string, any>;

    __moduleConfig?: ModuleConfig;
}

export function Module(config: ModuleConfig) {
    return function <T extends { new(...args: any[]): any }>(target: T) {
        Object.defineProperty(target, MODULE_CONFIG_KEY, {
            value: {
                name: config.name || target.name,
                description: config.description,
                version: config.version || '1.0.0',
                components: config.components || [],
                dependencies: config.dependencies || [],
                enabled: config.enabled !== false,
                config: config.config || null,
            },
            configurable: false,
            enumerable: false,
            writable: false,
        });

        return target;
    };
}

export const ModuleMetadata = {
    isModule(target: any): target is Function & { [MODULE_CONFIG_KEY]: ModuleConfig } {
        if (!target || typeof target !== 'function') {
            return false;
        }
        return Object.hasOwn(target, MODULE_CONFIG_KEY) && target.__moduleConfig !== undefined;
    },

    _getValue<K extends keyof ModuleConfig>(target: any, key: K) {
        if (this.isModule(target) && typeof target[MODULE_CONFIG_KEY][key] !== undefined) {
            return target[MODULE_CONFIG_KEY][key];
        }
        return;
    },

    getConfig(target: any) {
        return this._getValue(target, 'config');
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
