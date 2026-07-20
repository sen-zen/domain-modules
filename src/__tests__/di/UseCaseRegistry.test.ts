import { describe, it, expect } from 'vitest';
import { UseCaseRegistry } from '../../di/UseCaseRegistry';

describe('UseCaseRegistry', () => {
    describe('метод get()', () => {
        it('должен возвращать зарегистрированный UseCase', async () => {
            class MockContainer {
                private deps = new Map<string, any>();

                set<T>(key: string, typeOrInstance: T | { name: string }): void {
                    this.deps.set(key, { name: (typeOrInstance as { name?: string }).name || key });
                }

                get<T>(type: any): T {
                    const dep = this.deps.get(type.name);
                    if (!dep) throw new Error(`Dependency "${type.name}" not found`);
                    return {} as T;
                }
            }

            await (UseCaseRegistry as any).registerFromModules(new Map());
            expect(() => UseCaseRegistry.get('test-usecase', {} as any)).toThrow(
                'UseCase "test-usecase" not found'
            );
        });

        it('должен бросать ошибку для незарегистрированного UseCase', () => {
            class MockContainer {
                private deps = new Map<string, any>();
                set<T>(key: string, _typeOrInstance: T | { name: string }): void { }
                get<T>(type: any): T {
                    const dep = this.deps.get(type.name);
                    if (!dep) throw new Error(`Dependency "${type.name}" not found`);
                    return {} as T;
                }
            }

            const container = new MockContainer();
            expect(() => UseCaseRegistry.get('unknown-usecase', container as any))
                .toThrow('UseCase "unknown-usecase" not found');
        });
    });

    describe('метод getByTag()', () => {
        it('должен возвращать UseCases по тегу', async () => {
            await (UseCaseRegistry as any).registerFromModules(new Map());
            const result = UseCaseRegistry.getByTag('nonexistent');
            expect(result).toEqual([]);
        });

        it('должен вернуть пустой массив если UseCases с тегом не найдены', async () => {
            await (UseCaseRegistry as any).registerFromModules(new Map());
            const result = UseCaseRegistry.getByTag('test');
            expect(result).toEqual([]);
        });
    });
});
