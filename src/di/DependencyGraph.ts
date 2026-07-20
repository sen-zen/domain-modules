export interface GraphNode {
    name: string;
    dependencies: string[];
    nodeClass: any;
    nodeDir: string;
}

/**
 * Граф зависимостей с топологической сортировкой
 */
export class DependencyGraph {
    private nodes: Map<string, GraphNode> = new Map();

    addNode = (node: GraphNode) => {
        if (typeof node !== "object" || node === null || !Object.hasOwn(node, 'nodeClass')) {
            console.warn('[DependencyGraph] Cannot add null/undefined node');
            return this;
        }

        const name = node.name ?? node.nodeClass.name;
        if (!name) {
            console.warn('[DependencyGraph] NodeClass has no name');
            return this;
        }

        this.nodes.set(name, node);

        return this;
    }

    addNodes(nodes: GraphNode[]) {
        nodes.forEach((node) => this.addNode(node));
        return this;
    }

    /**
     * Топологическая сортировка (DFS)
     */
    sort(): GraphNode[] {
        if (this.nodes.size === 0) {
            return [];
        }

        const visited = new Set<string>();
        const visiting = new Set<string>();
        const result: GraphNode[] = [];
        const allNames = Array.from(this.nodes.keys());

        const visit = (name: string): void => {
            if (visiting.has(name)) {
                const cycle = Array.from(visiting).join(' → ') + ` → ${name}`;
                throw new Error(`Circular dependency detected: ${cycle}`);
            }

            if (visited.has(name)) {
                return;
            }

            visiting.add(name);

            const node = this.nodes.get(name);

            if (node) {
                for (const dep of node.dependencies) {
                    if (this.nodes.has(dep)) {
                        visit(dep);
                    } else {
                        console.warn(`[Graph] Warning: "${name}" depends on "${dep}" which is not registered`);
                    }
                }
            }

            visiting.delete(name);
            visited.add(name);

            if (node) {
                result.push(node);
            }
        }

        for (const name of allNames) {
            if (!visited.has(name)) {
                visit(name);
            }
        }

        return result;
    }

    /**
     * Получает все имена модулей
     */
    getNames(): string[] {
        return Array.from(this.nodes.keys());
    }

    /**
     * Проверяет, есть ли модуль в графе
     */
    has(name: string): boolean {
        return this.nodes.has(name);
    }

    /**
     * Получает размер графа
     */
    size(): number {
        return this.nodes.size;
    }

    /**
     * Очищает граф
     */
    clear(): void {
        this.nodes.clear();
    }
}
