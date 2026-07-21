import { describe, it, expect, beforeEach } from 'vitest';
import { Container } from '../../di/Container';

describe('Container', () => {
    let container: Container;

    class TestService {
        id: number;
        data?: string;
        constructor(id?: number) {
            this.id = id ?? Math.random();
        }
    }

    beforeEach(() => {
        container = new Container();
    });

    describe('метод set()', () => {
        it('должен регистрировать зависимость как singleton', () => {
            class TestService { }

            const instance = new TestService();
            container.set('test', instance, 'singleton');

            expect(container.has('test')).toBe(true);
            const result = container.get('test');
            expect(result).toBe(instance);
        });

        it('должен поддерживать request scope через setFactory', () => {
            let counter = 0;
            class RequestScopedService {
                id: number;
                constructor() {
                    this.id = ++counter;
                }
            }

            container.setFactory('test', () => new RequestScopedService(), 'request');

            // ✅ Типизируем переменные
            let instance1: RequestScopedService | undefined;
            let instance2: RequestScopedService | undefined;

            container.runInRequestScope(() => {
                const service = container.get<RequestScopedService>('test');
                instance1 = service;

                // Второй get в том же запросе должен вернуть тот же экземпляр
                const service2 = container.get<RequestScopedService>('test');
                expect(service).toBe(service2);
            });

            // ✅ Новый запрос - новый экземпляр
            container.runInRequestScope(() => {
                const service = container.get<RequestScopedService>('test');
                instance2 = service;
            });

            expect(instance1).toBeDefined();
            expect(instance2).toBeDefined();
            expect(instance1).not.toBe(instance2);
            expect(instance1?.id).toBe(1);
            expect(instance2?.id).toBe(2);
        });

        it('должен выбрасывать ошибку при request scope без контекста', () => {
            container.setFactory('test', () => ({}), 'request');

            expect(() => container.get('test')).toThrow(
                'Request-scoped dependency accessed outside of request context'
            );
        });

        it('должен поддерживать transient scope', () => {
            let counter = 0;
            class TransientService {
                id: number;
                constructor() {
                    this.id = ++counter;
                }
            }

            container.setFactory('test', () => new TransientService(), 'transient');

            const instance1 = container.get<TransientService>('test');
            const instance2 = container.get<TransientService>('test');

            // Каждый get() должен возвращать новый экземпляр
            expect(instance1).not.toBe(instance2);
            expect(instance1.id).toBe(1);
            expect(instance2.id).toBe(2);
        });

        it('должен регистрировать фабрику', () => {
            let counter = 0;
            class FactoryService {
                id: number;
                constructor() {
                    this.id = ++counter;
                }
            }

            container.setFactory('test', () => new FactoryService(), 'singleton');

            const instance1 = container.get<FactoryService>('test');
            const instance2 = container.get<FactoryService>('test');

            // Singleton - один экземпляр
            expect(instance1).toBe(instance2);
            expect(instance1.id).toBe(1);
        });
    });

    describe('метод has()', () => {
        it('должен проверять наличие зависимости', () => {
            container.set('test', new TestService(1));
            expect(container.has('test')).toBe(true);
            expect(container.has('unknown')).toBe(false);
        });

        it('должен проверять наличие фабрики', () => {
            container.setFactory('test', () => new TestService());
            expect(container.has('test')).toBe(true);
        });
    });

    describe('метод clear()', () => {
        it('должен очищать все зависимости', () => {
            container.set('test', new TestService(1));
            container.setFactory('factory', () => new TestService());

            expect(container.has('test')).toBe(true);
            expect(container.has('factory')).toBe(true);

            container.clear();

            expect(container.has('test')).toBe(false);
            expect(container.has('factory')).toBe(false);
        });
    });

    describe('метод createChild()', () => {
        it('должен создавать дочерний контейнер', () => {
            const parentInstance = new TestService(1);
            container.set('parent', parentInstance);

            const child = container.createChild();

            expect(child.has('parent')).toBe(true);
            const result = child.get<TestService>('parent');
            expect(result).toBe(parentInstance);
        });

        it('дочерний контейнер должен иметь свои зависимости', () => {
            const child = container.createChild();
            const childInstance = new TestService(2);
            child.set('child', childInstance);

            expect(child.has('child')).toBe(true);
            expect(container.has('child')).toBe(false);
        });
    });

    describe('метод merge()', () => {
        it('должен объединять контейнеры', () => {
            const other = new Container();
            const otherInstance = new TestService(3);
            other.set('other', otherInstance);

            container.merge(other);

            expect(container.has('other')).toBe(true);
            const result = container.get<TestService>('other');
            expect(result).toBe(otherInstance);
        });
    });

    describe('изоляция запросов', () => {
        it('должен изолировать request-scoped зависимости между запросами', () => {
            let counter = 0;
            class IsolatedService {
                id: number;
                data: string;
                constructor() {
                    this.id = ++counter;
                    this.data = `data-${this.id}`;
                }
            }

            container.setFactory('test', () => new IsolatedService(), 'request');

            const resultsArray: IsolatedService[] = [];

            // ✅ Запрос 1
            container.runInRequestScope(() => {
                const service = container.get<IsolatedService>('test');
                resultsArray.push(service);

                // Второй get в том же запросе должен вернуть тот же экземпляр
                const service2 = container.get<IsolatedService>('test');
                expect(service).toBe(service2);
            });

            // ✅ Запрос 2
            container.runInRequestScope(() => {
                const service = container.get<IsolatedService>('test');
                resultsArray.push(service);
            });

            // ✅ Запрос 3
            container.runInRequestScope(() => {
                const service = container.get<IsolatedService>('test');
                resultsArray.push(service);
            });

            expect(resultsArray).toHaveLength(3);

            expect(resultsArray[0]?.id).toBe(1);
            expect(resultsArray[1]?.id).toBe(2);
            expect(resultsArray[2]?.id).toBe(3);

            expect(resultsArray[0]?.data).toBe('data-1');
            expect(resultsArray[1]?.data).toBe('data-2');
            expect(resultsArray[2]?.data).toBe('data-3');
        });

        it('должен поддерживать вложенные запросы', () => {
            let counter = 0;
            class NestedService {
                id: number;
                constructor() {
                    this.id = ++counter;
                }
            }

            container.setFactory('test', () => new NestedService(), 'request');

            // ✅ Внешний запрос
            container.runInRequestScope(() => {
                const outer = container.get<NestedService>('test');
                expect(outer.id).toBe(1);

                // ✅ Вложенный запрос
                container.runInRequestScope(() => {
                    const inner = container.get<NestedService>('test');
                    expect(inner.id).toBe(2);
                    expect(inner).not.toBe(outer);
                });

                // После завершения вложенного запроса, внешний должен сохранить свой контекст
                const outerAgain = container.get<NestedService>('test');
                expect(outerAgain).toBe(outer);
                expect(outerAgain.id).toBe(1);
            });
        });

        it('должен обрабатывать параллельные запросы', async () => {
            let counter = 0;
            class ParallelService {
                id: number;
                constructor() {
                    this.id = ++counter;
                }
            }

            container.setFactory('test', () => new ParallelService(), 'request');

            // ✅ Имитируем параллельные запросы
            const promises = Array.from({ length: 5 }, () => {
                return new Promise<number>((resolve) => {
                    setTimeout(() => {
                        container.runInRequestScope(() => {
                            const service = container.get<ParallelService>('test');
                            resolve(service.id);
                        });
                    }, Math.random() * 10);
                });
            });

            const results = await Promise.all(promises);

            // Все ID должны быть уникальными
            const uniqueIds = new Set(results);
            expect(uniqueIds.size).toBe(5);

            // ID должны быть последовательными
            expect(results.sort()).toEqual([1, 2, 3, 4, 5]);
        });
    });

    describe('типизация', () => {
        it('должен правильно типизировать get с дженериком', () => {
            class TypedService {
                name: string;
                value: number;
                constructor(name: string, value: number) {
                    this.name = name;
                    this.value = value;
                }
            }

            const service = new TypedService('test', 42);
            container.set('typed', service);

            // ✅ Явно указываем тип
            const result = container.get<TypedService>('typed');
            expect(result.name).toBe('test');
            expect(result.value).toBe(42);
        });

        it('должен правильно типизировать фабрику', () => {
            interface IService {
                id: number;
                getName(): string;
            }

            class ServiceImpl implements IService {
                id: number;
                constructor(id: number) {
                    this.id = id;
                }
                getName(): string {
                    return `Service-${this.id}`;
                }
            }

            container.setFactory('service', () => new ServiceImpl(1));

            // ✅ TypeScript знает тип
            const service = container.get<IService>('service');
            expect(service.id).toBe(1);
            expect(service.getName()).toBe('Service-1');
        });
    });
});
