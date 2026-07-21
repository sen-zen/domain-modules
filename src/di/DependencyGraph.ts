export interface GraphNode {
    name: string;
    dependencies: string[];
    nodeClass: any;
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

    sort(): GraphNode[] {
        const inDegree = new Map<string, number>();
        const sorted: GraphNode[] = [];
        const invalid: string[] = [];
        const queue: string[] = [];

        for (const [name, node] of this.nodes) {
            const validDeps = [];
            const deps = node.dependencies || [];

            for (const dep of deps) {
                if (this.nodes.has(dep)) {
                    validDeps.push(dep);
                } else {
                    invalid.push(dep);
                }
            }

            inDegree.set(name, validDeps.length);
        }

        if (invalid.length) {
            console.warn('[DependencyGraph] Invalid dependencies detected:', invalid);
            return [];
        }

        const sortedNames = Array.from(inDegree.entries())
            .filter(([_, degree]) => degree === 0)
            .map(([name]) => name)
            .sort((a, b) => a.localeCompare(b));

        queue.push(...sortedNames);

        while (queue.length > 0) {
            const current = queue.shift()!;
            const node = this.nodes.get(current);

            if (!node) {
                continue;
            }

            sorted.push(node);

            const dependents: string[] = [];
            for (const [name, otherNode] of this.nodes) {
                const deps = otherNode.dependencies || [];
                if (deps.includes(current)) {
                    const newDegree = (inDegree.get(name) || 0) - 1;
                    inDegree.set(name, newDegree);

                    if (newDegree === 0) {
                        dependents.push(name);
                    }
                }
            }

            dependents.sort((a, b) => a.localeCompare(b));
            queue.push(...dependents);
        }

        if (sorted.length !== this.nodes.size) {
            const missing = Array.from(this.nodes.keys()).filter(name => !sorted.some(n => n.name === name));
            console.warn('[DependencyGraph] Circular dependency detected:', missing);
        }

        return sorted;
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
