
import { Component, ComponentMetadata } from './Component';

import type { Scope } from '../types';
import type { ComponentConfig } from './Component';

export const USE_CASE_CONFIG_KEY = "__useCaseConfig";

export interface UseCaseConfig extends ComponentConfig {
    /** Модуль, к которому принадлежит UseCase */
    module: string;

    /** Здесь задается скоуп */
    scope?: Scope;

    /** Включить кеширование результатов */
    cache?: boolean | {
        ttl: number;          // Время жизни кеша в мс
        key?: (args: any[]) => string; // Функция для генерации ключа
    };

    /** Таймаут выполнения в мс */
    timeout?: number;

    /** Теги для группировки и поиска */
    tags?: string[];

    /** Требует ли авторизацию */
    requiresAuth?: boolean;

    /** Роли, имеющие доступ */
    roles?: string[];

    /** Лимит запросов (rate limit) */
    rateLimit?: {
        points: number;       // Количество запросов
        duration: number;     // Интервал в мс
    };

    /** Логирование */
    log?: {
        enabled: boolean;
        level: 'debug' | 'info' | 'warn' | 'error';
    };
}

export function UseCase(config: UseCaseConfig) {
    const baseFunction = Component(config);

    return function (target: any) {
        const decoratedTarget = baseFunction(target);

        Object.defineProperty(decoratedTarget, USE_CASE_CONFIG_KEY, {
            value: {
                module: config.module,
                cache: config.cache || false,
                timeout: config.timeout || 0,
                tags: config.tags || [],
                requiresAuth: config.requiresAuth || false,
                roles: config.roles || [],
                rateLimit: config.rateLimit || null,
                log: config.log || { enabled: false, level: 'info' }
            },
            configurable: false,
            enumerable: false,
            writable: false,
        });

        return decoratedTarget;
    };
}

export const UseCaseMetadata = {
    ...ComponentMetadata,

    isUseCase(target: any): target is Function & { [USE_CASE_CONFIG_KEY]: UseCaseConfig } {
        if (!target || typeof target !== 'function') {
            return false;
        }
        return Object.hasOwn(target, USE_CASE_CONFIG_KEY) && target[USE_CASE_CONFIG_KEY] !== undefined;
    },

    _getUseCaseValue<K extends keyof UseCaseConfig>(target: any, key: K): UseCaseConfig[K] | undefined {
        if (this.isUseCase(target)) {
            return target[USE_CASE_CONFIG_KEY][key];
        }
        return;
    },

    getModule(target: any): string {
        return this._getUseCaseValue(target, 'module') ?? 'Unknown';
    },

    getCache(target: any): any {
        return this._getUseCaseValue(target, 'cache') ?? false;
    },

    getTimeout(target: any): number {
        return this._getUseCaseValue(target, 'timeout') ?? 0;
    },

    getTags(target: any): string[] {
        return this._getUseCaseValue(target, 'tags') ?? [];
    },

    requiresAuth(target: any): boolean {
        return this._getUseCaseValue(target, 'requiresAuth') ?? false;
    },

    getRoles(target: any): string[] {
        return this._getUseCaseValue(target, 'roles') ?? [];
    },

    getRateLimit(target: any): any {
        return this._getUseCaseValue(target, 'rateLimit') ?? null;
    },

    getLogConfig(target: any): any {
        return this._getUseCaseValue(target, 'log') ?? { enabled: false, level: 'info' };
    },
};
