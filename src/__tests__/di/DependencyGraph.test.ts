import { describe, it, expect } from 'vitest';
import { Module, ModuleMetadata } from '../../decorators/Module';
import { DependencyGraph } from '../../di/DependencyGraph';

describe('DependencyGraph', () => {
    it('создает пустой граф', () => {
        const graph = new DependencyGraph();
        expect(graph.size()).toBe(0);
        expect(graph.sort()).toEqual([]);
    });

    it('добавляет модуль в граф', () => {
        @Module({
            name: 'TestModule',
            useCases: [],
            repositories: [],
        })
        class TestModule { }

        const graph = new DependencyGraph();
        graph.addNode(TestModule, ModuleMetadata.getName(TestModule), ModuleMetadata.getDependencies(TestModule));

        expect(graph.size()).toBe(1);
        expect(graph.has('TestModule')).toBe(true);
    });

    it('обрабатывает невалидные модули', () => {
        const graph = new DependencyGraph();

        graph.addNode(null, 'test');
        graph.addNode({ not: 'module' }, '');

        expect(graph.size()).toBe(0);
    });

    it('сортирует модули по зависимостям', () => {
        @Module({
            useCases: [],
            repositories: [],
        })
        class CoreModule { }

        @Module({
            useCases: [],
            repositories: [],
            dependencies: ['CoreModule'],
        })
        class AuthModule { }

        @Module({
            dependencies: ['AuthModule', 'CoreModule'],
        })
        class UserModule { }

        const graph = new DependencyGraph();
        const sorted = graph
            .addNodes([
                { nodeClass: UserModule, name: 'UserModule', dependencies: ['AuthModule', 'CoreModule'] },
                { nodeClass: AuthModule, name: 'AuthModule', dependencies: ['CoreModule'] },
                { nodeClass: CoreModule, name: 'CoreModule', dependencies: [] }])
            .sort();

        const names = sorted.map(m => ModuleMetadata.getName(m));
        expect(names).toEqual(['CoreModule', 'AuthModule', 'UserModule']);
    });
});