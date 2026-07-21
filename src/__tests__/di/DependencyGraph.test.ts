import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DependencyGraph } from '../../di/DependencyGraph';

describe('DependencyGraph', () => {
    let graph: DependencyGraph;

    beforeEach(() => {
        graph = new DependencyGraph();

        vi.spyOn(console, 'info').mockImplementation(() => { });
        vi.spyOn(console, 'warn').mockImplementation(() => { });
        vi.spyOn(console, 'error').mockImplementation(() => { });
    });

    it('сортирует простую цепочку зависимостей', () => {
        graph.addNodes([
            { name: 'UserModule', dependencies: ['AuthModule', 'CoreModule'], nodeClass: class UserModule { } },
            { name: 'AuthModule', dependencies: ['CoreModule'], nodeClass: class AuthModule { } },
            { name: 'CoreModule', dependencies: [], nodeClass: class CoreModule { } },
        ]);

        const sorted = graph.sort();
        expect(sorted.map(n => n.name)).toEqual(['CoreModule', 'AuthModule', 'UserModule']);
    });

    it('сортирует модули с ветвлением', () => {
        graph.addNodes([
            { name: 'OrderModule', dependencies: ['AuthModule', 'PaymentModule'], nodeClass: class OrderModule { } },
            { name: 'AuthModule', dependencies: ['CoreModule'], nodeClass: class AuthModule { } },
            { name: 'PaymentModule', dependencies: ['CoreModule'], nodeClass: class PaymentModule { } },
            { name: 'CoreModule', dependencies: [], nodeClass: class CoreModule { } },
        ]);

        const sorted = graph.sort();
        const names = sorted.map(n => n.name);

        expect(names[0]).toBe('CoreModule');
        expect(names.slice(1, 3)).toContain('AuthModule');
        expect(names.slice(1, 3)).toContain('PaymentModule');
        expect(names[names.length - 1]).toBe('OrderModule');
    });

    it('сортирует модули с одинаковым количеством зависимостей по имени', () => {
        graph.addNodes([
            { name: 'ModuleC', dependencies: ['Core'], nodeClass: class ModuleC { } },
            { name: 'ModuleA', dependencies: ['Core'], nodeClass: class ModuleA { } },
            { name: 'ModuleB', dependencies: ['Core'], nodeClass: class ModuleB { } },
            { name: 'Core', dependencies: [], nodeClass: class Core { } },
        ]);

        const sorted = graph.sort();
        expect(sorted.map(n => n.name))
            .toEqual(['Core', 'ModuleA', 'ModuleB', 'ModuleC']);
    });

    it('обнаруживает циклические зависимости', () => {
        graph.addNodes([
            { name: 'ModuleA', dependencies: ['ModuleB'], nodeClass: class ModuleA { } },
            { name: 'ModuleB', dependencies: ['ModuleA'], nodeClass: class ModuleB { } },
        ]);

        const sorted = graph.sort();
        expect(sorted.length).toBe(0); // Цикл не может быть отсортирован
        expect(console.warn).toHaveBeenCalled();
    });

    it('обнаруживает несуществующие зависимости', () => {
        graph.addNodes([
            { name: 'ModuleA', dependencies: ['NonExistent'], nodeClass: class ModuleA { } },
        ]);

        const sorted = graph.sort();
        expect(sorted.length).toBe(0);
        expect(console.warn).toHaveBeenCalled();
    });

    it('дает стабильный результат при любом порядке добавления', () => {
        const modules = [
            { name: 'ModuleC', dependencies: ['Core'], nodeClass: class ModuleC { } },
            { name: 'ModuleA', dependencies: ['Core'], nodeClass: class ModuleA { } },
            { name: 'ModuleB', dependencies: ['Core'], nodeClass: class ModuleB { } },
            { name: 'Core', dependencies: [], nodeClass: class Core { } },
        ];

        const orders = [
            ['ModuleC', 'ModuleA', 'ModuleB', 'Core'],
            ['Core', 'ModuleA', 'ModuleB', 'ModuleC'],
            ['ModuleB', 'ModuleC', 'Core', 'ModuleA'],
        ];

        for (const order of orders) {
            const g = new DependencyGraph();
            for (const name of order) {
                const node = modules.find(m => m.name === name)!;
                g.addNode(node);
            }

            const sorted = g.sort();
            expect(sorted.map(m => m.name))
                .toEqual(['Core', 'ModuleA', 'ModuleB', 'ModuleC']);
        }
    });

    it('обрабатывает пустой граф', () => {
        expect(graph.sort()).toEqual([]);
        expect(graph.getNames()).toEqual([]);
        expect(graph.size()).toBe(0);
    });

    it('обрабатывает модули без зависимостей', () => {
        graph.addNodes([
            { name: 'ModuleA', dependencies: [], nodeClass: class ModuleA { } },
            { name: 'ModuleB', dependencies: [], nodeClass: class ModuleB { } },
            { name: 'ModuleC', dependencies: [], nodeClass: class ModuleC { } },
        ]);

        const sorted = graph.sort();
        expect(sorted.map(n => n.name)).toEqual(['ModuleA', 'ModuleB', 'ModuleC']);
    });

    it('сортирует сложную структуру', () => {
        graph.addNodes([
            { name: 'ApiModule', dependencies: ['UserModule', 'AuthModule'], nodeClass: class ApiModule { } },
            { name: 'UserModule', dependencies: ['AuthModule', 'DatabaseModule'], nodeClass: class UserModule { } },
            { name: 'AuthModule', dependencies: ['CoreModule', 'LoggerModule'], nodeClass: class AuthModule { } },
            { name: 'DatabaseModule', dependencies: ['CoreModule', 'LoggerModule'], nodeClass: class DatabaseModule { } },
            { name: 'LoggerModule', dependencies: ['CoreModule'], nodeClass: class LoggerModule { } },
            { name: 'CoreModule', dependencies: [], nodeClass: class CoreModule { } },
        ]);

        const sorted = graph.sort();
        const names = sorted.map(n => n.name);

        expect(names[0]).toBe('CoreModule');
        expect(names[1]).toBe('LoggerModule');
        expect(names.slice(2, 4)).toContain('AuthModule');
        expect(names.slice(2, 4)).toContain('DatabaseModule');
        expect(names[4]).toBe('UserModule');
        expect(names[5]).toBe('ApiModule');
    });
});
