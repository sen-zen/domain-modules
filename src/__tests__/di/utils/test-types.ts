import { writeFile } from 'node:fs/promises';
import { MODULE_CONFIG_KEY, ModuleConfig } from '@/decorators/Module';
import { COMPONENT_CONFIG_KEY, ComponentConfig } from '@/decorators/Component';

export async function createTestModuleFile(
    dir: string,
    name: string,
    config: Omit<ModuleConfig, 'name'> = {}
): Promise<string> {
    const filePath = `${dir}/${name}.module.js`;
    const content = `
        export class ${name} {
            static ${MODULE_CONFIG_KEY} = {
                name: '${name}',
                dependencies: ${JSON.stringify(config.dependencies || [])},
                enabled: ${config.enabled !== false},
                version: '${config.version || '1.0.0'}',
                config: ${JSON.stringify(config.config || null)},
            };
        }
    `;

    await writeFile(filePath, content);
    return filePath;
}

export async function createTestComponentFile(
    dir: string,
    name: string,
    config: Omit<ComponentConfig, 'name'> = {}
): Promise<string> {
    const filePath = `${dir}/${name}.js`;
    const content = `
        export class ${name} {
            static ${COMPONENT_CONFIG_KEY} = {
                name: '${name}',
                scope: ${JSON.stringify(config.scope || "request")},
                dependencies: ${JSON.stringify(config.dependencies || [])},
            };
        }
    `;
    await writeFile(filePath, content);
    return filePath;
}

