import { writeFile } from 'node:fs/promises';
import { MODULE_CONFIG_KEY, ModuleConfig } from '@/decorators/Module';
import { COMPONENT_CONFIG_KEY, ComponentConfig } from '@/decorators/Component';

export async function createTestModuleFile(
    dir: string,
    name: string,
    config: Partial<Omit<ModuleConfig, 'name'>> = {}
): Promise<string> {
    const filePath = `${dir}/${name}.module.js`;
    const content = `
        export class ${name} {
            static ${MODULE_CONFIG_KEY} = {
                name: '${name}',
                components: ${JSON.stringify(config.components || [])},
                dependencies: ${JSON.stringify(config.dependencies || [])},
                enabled: ${config.enabled !== false},
                version: '${config.version || '1.0.0'}',
            };
        }
    `;

    await writeFile(filePath, content);
    return filePath;
}

interface IComponentConfig extends Omit<ComponentConfig, 'name'> {
    methods?: Record<string, string>
}

export async function createTestComponentFile(
    dir: string,
    name: string,
    config: Partial<IComponentConfig> = {}
): Promise<string> {
    const methodsCode = Object.entries(config.methods || {})
        .map(([methodName, methodBody]) => {
            return `${methodName}() { ${methodBody} }`;
        })
        .join('\n');


    const filePath = `${dir}/${name}.js`;
    const content = `
        export class ${name} {
            static ${COMPONENT_CONFIG_KEY} = {
                name: '${name}',
                scope: ${JSON.stringify(config.scope || "request")},
                dependencies: ${JSON.stringify(config.dependencies || [])},
            };

            ${methodsCode}
        }
    `;
    await writeFile(filePath, content);
    return filePath;
}

