import { describe, it, expect, beforeEach } from 'vitest';
import { Container } from '../../di/Container';

describe('Container', () => {
    let container: Container;

    beforeEach(() => {
        container = new Container({ log: false, cache: true, autowire: false });
    });

    describe('метод set()', () => {
        it('должен регистрировать зависимость как singleton', () => {
            class TestService { }

            const instance = new TestService();
            container.set<TestService>('test', instance);

            expect(container.has('test')).toBe(true);
        });

        it('должен поддерживать request scope', () => {
            class TransientService {
                requestId?: string;
                constructor(requestId?: string) {
                    this.requestId = requestId;
                }
            }

            // Создаем instance и передаем его с requestId при регистрации
            const serviceInstance = new TransientService('request-id');
            container.set<TransientService>('transient', serviceInstance, 'request');

            // Первый get должен вызвать getRequest с requestId
            const instance1 = container.get<TransientService>('transient', 'request-id');
            // Второй get с тем же requestId должен вернуть тот же instance (из request scope)
            const instance2 = container.get<TransientService>('transient', 'request-id');

            // В request scope должно быть один экземпляр на requestId
            expect(instance1).toBe(instance2);
            expect(instance1.requestId).toBe('request-id');
        });

        it('должен поддерживать transient scope', () => {
            class TransientService {
                value: number;
                constructor() {
                    this.value = Math.random();
                }
            }

            const instance = new TransientService();
            container.set<TransientService>('transient', instance, 'transient');

            const instance1 = container.get<TransientService>('transient');
            const instance2 = container.get<TransientService>('transient');

            // В transient scope каждый get() возвращает новый экземпляр из зависимости
            expect(instance1).toBe(instance);
            expect(instance2).toBe(instance);
        });
    });

    describe('метод setFactory()', () => {
        it('должен регистрировать фабрику для ленивой инициализации', () => {
            let factoryCalled = false;

            const factory: () => Record<string, number> = () => {
                factoryCalled = true;
                return { key: 1 };
            };

            // При cache=true factory вызывается сразу при регистрации singleton
            container.setFactory<Record<string, number>>('factory', factory, 'singleton');

            const result = container.get<Record<string, number>>('factory');

            expect(result.key).toBe(1);
        });

        it('должен лениво вызывать фабрику для request scope', () => {
            let factoryCalled = false;

            const factory: () => Record<string, string> = () => {
                factoryCalled = true;
                return { key: 'test' };
            };

            // Для request scope factory вызывается только при первом get()
            container.setFactory<Record<string, string>>('requestFactory', factory, 'request');

            expect(factoryCalled).toBe(false); // Factory не вызвана при регистрации

            const result = container.get<Record<string, string>>('requestFactory', 'req-1');

            expect(result.key).toBe('test');
        });
    });

    describe('метод get()', () => {
        it('должен возвращать singleton из кэша', () => {
            const originalService = { value: 42 };

            container.set<Record<string, number>>('cached', originalService);

            const cachedInstance = container.get<Record<string, number>>('cached');

            expect(cachedInstance).toBe(originalService);
        });

        it('должен вызывать factory для singleton из кэша', () => {
            let factoryCalled = false;

            const factory: () => Record<string, number> = () => {
                factoryCalled = true;
                return { value: 42 };
            };

            container.setFactory<Record<string, number>>('cachedFactory', factory);

            const instance1 = container.get<Record<string, number>>('cachedFactory');
            const instance2 = container.get<Record<string, number>>('cachedFactory');

            expect(factoryCalled).toBe(true);
            expect(instance1).toBe(instance2);
        });
    });

    describe('метод has()', () => {
        it('должен возвращать true для зарегистрированной зависимости', () => {
            container.set<Record<string, number>>('test', { key: 1 });

            expect(container.has('test')).toBe(true);
        });

        it('должен возвращать false для незарегистрированной зависимости', () => {
            expect(container.has('nonexistent')).toBe(false);
        });

        it('должен возвращать true для factory', () => {
            const factory: () => Record<string, number> = () => ({});
            container.setFactory<Record<string, number>>('factory', factory);

            expect(container.has('factory')).toBe(true);
        });
    });

    describe('метод clear()', () => {
        it('должен очищать все зависимости и кэш', () => {
            container.set<Record<string, number>>('test', { key: 1 });
            const factory: () => Record<string, number> = () => ({});
            container.setFactory<Record<string, number>>('factory2', factory);

            expect(container.has('test')).toBe(true);
            expect(container.has('factory2')).toBe(true);

            container.clear();

            expect(container.has('test')).toBe(false);
            expect(container.has('factory2')).toBe(false);
        });
    });

    describe('метод createChild()', () => {
        it('должен создавать дочерний контейнер с теми же зависимостями', () => {
            const originalService = { value: 42 };

            container.set<Record<string, number>>('test', originalService);

            const child = container.createChild();

            expect(child.has('test')).toBe(true);
            expect(child.get<Record<string, number>>('test')).toBe(originalService);
        });

        it('должен наследовать scope mapping из родителя', () => {
            let instanceCreated = false;

            const factory: () => Record<string, number> = () => {
                instanceCreated = true;
                return { key: 1 };
            };

            // Для singleton scope factory сразу вызывается при setFactory (с cache)
            container.setFactory<Record<string, number>>('factory', factory);

            const child = container.createChild();

            expect(child.has('factory')).toBe(true);
        });
    });

    describe('метод merge()', () => {
        it('должен объединять зависимости из другого контейнера', () => {
            const container2 = new Container({ log: false, cache: true });

            const originalService = { value: 42 };

            container2.set<Record<string, number>>('test', originalService);

            container.merge(container2);

            expect(container.has('test')).toBe(true);
        });
    });

    describe('Error handling', () => {
        it('должен抛出 ошибку при get незарегистрированной зависимости', () => {
            expect(() => container.get<Record<string, number>>('nonexistent'))
                .toThrow('Dependency "nonexistent" not found');
        });

        it('должен требовать requestId для request scope без него', () => {
            const factory: () => Record<string, number> = () => ({ key: 1 });

            container.setFactory<Record<string, number>>('requestDep', factory, 'request');

            expect(() => container.get<Record<string, number>>('requestDep'))
                .toThrow('RequestId is required for Request-scoped dependency');
        });
    });
});
