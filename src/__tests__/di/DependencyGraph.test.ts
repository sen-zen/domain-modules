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
            components: [],
        })
        class TestModule { }

        const graph = new DependencyGraph();
        graph.addNode({
            nodeClass: TestModule,
            name: ModuleMetadata.getName(TestModule),
            dependencies: ModuleMetadata.getDependencies(TestModule),
            nodeDir: ''
        });

        expect(graph.size()).toBe(1);
        expect(graph.has('TestModule')).toBe(true);
    });

    it('обрабатывает невалидные модули', () => {
        const graph = new DependencyGraph();

        // @ts-ignore
        graph.addNode(null);

        // @ts-ignore
        graph.addNode({ not: 'module' });

        expect(graph.size()).toBe(0);
    });

    it('сортирует модули по зависимостям', () => {
        @Module({ components: [] })
        class CoreModule { }

        @Module({ dependencies: ['CoreModule'] })
        class AuthModule { }

        @Module({ dependencies: ['AuthModule', 'CoreModule'] })
        class UserModule { }

        const graph = new DependencyGraph();
        const sorted = graph
            .addNodes([
                {
                    nodeClass: UserModule,
                    name: ModuleMetadata.getName(UserModule),
                    dependencies: ModuleMetadata.getDependencies(UserModule),
                    nodeDir: ''
                },
                {
                    nodeClass: AuthModule,
                    name: ModuleMetadata.getName(AuthModule),
                    dependencies: ModuleMetadata.getDependencies(AuthModule),
                    nodeDir: ''
                },
                {
                    nodeClass: CoreModule,
                    name: ModuleMetadata.getName(CoreModule),
                    dependencies: ModuleMetadata.getDependencies(CoreModule),
                    nodeDir: ''
                }
            ])
            .sort();

        const names = sorted.map(m => ModuleMetadata.getName(m.nodeClass));
        expect(names).toEqual(['CoreModule', 'AuthModule', 'UserModule']);
    });
});