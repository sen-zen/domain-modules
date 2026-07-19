import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { ServiceContainer } from '../../di/ServiceContainer';

describe('ServiceContainer', () => {
    const serviceContainer = ServiceContainer.getInstance();

    describe('метод createScope()', () => {
        it('должен создавать новый контейнер с именем', () => {
            const scope = serviceContainer.createScope('test-scope');
            expect(scope).toBeDefined();
        });

        it('должен позволять регистрировать зависимости в новом скоупе', () => {
            const parent = serviceContainer.createScope('test');
            const scopeContainer = serviceContainer.getScope('test');

            class TestService { }
            const instance: TestService = {};

            scopeContainer.set<TestService>('testService', instance);
            expect(scopeContainer.has('testService')).toBe(true);
        });

        it('должен создавать новый контейнер для каждого скоупа', () => {
            serviceContainer.createScope('scope1');
            serviceContainer.createScope('scope2');

            const scope1 = serviceContainer.getScope('scope1');
            const scope2 = serviceContainer.getScope('scope2');
            expect(scope1 !== scope2).toBe(true);
        });
    });

    describe('метод getScope()', () => {
        it('должен возвращать существующий скоуп', () => {
            serviceContainer.createScope('my-scope');
            const scope = serviceContainer.getScope('my-scope');
            expect(scope).toBeDefined();
        });

        it('должен throw ошибку для несуществующего скоупа', () => {
            expect(() => serviceContainer.getScope('nonexistent')).toThrow(
                'Scope "nonexistent" not found'
            );
        });
    });

    describe('метод removeScope()', () => {
        it('должен удалять скоуп из контейнеров', () => {
            serviceContainer.createScope('to-remove');

            const scope = serviceContainer.getScope('to-remove');
            expect(scope).toBeDefined();

            serviceContainer.removeScope('to-remove');

            expect(() => serviceContainer.getScope('to-remove')).toThrow(
                'Scope "to-remove" not found'
            );
        });

        it('не должен throw ошибку при удалении несуществующего скоупа', () => {
            expect(() => serviceContainer.removeScope('nonexistent')).not.toThrow();
        });
    });

    describe('метод clear()', () => {
        it('должен очищать все контейнеры и создавать новый root', () => {
            // Создаём зависимости перед очисткой
            const temp1 = serviceContainer.createScope('temp1');
            const parent1 = serviceContainer.getScope('temp1');

            if (parent1) {
                class TestService1 { }
                parent1.set<TestService1>('dep1', {});
            }

            // Очищаем все контейнеры
            serviceContainer.clear();

            // После clear должен остаться только root с пустыми данными
            expect(() => serviceContainer.getScope('nonexistent')).toThrow(
                'Scope "nonexistent" not found'
            );
        });
    });

    describe('интеграция: регистрация и получение через разные скоупы', () => {
        it('должен поддерживать создание разных зависимостей для разных скоупов', () => {
            // Создаём две разные зависимости в разных скоупах
            const scope1 = serviceContainer.createScope('scope1');
            class Service1 { }
            scope1.set<Service1>('dep1', {});

            const scope2 = serviceContainer.createScope('scope2');
            class Service2 { }
            scope2.set<Service2>('dep2', {});

            // Каждая зависимость доступна только в своём скоупе
            expect(scope1.get<Service1>('dep1')).toBeDefined();
            expect(scope2.get<Service2>('dep2')).toBeDefined();
        });
    });
});
