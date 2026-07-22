import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const MODULE_CONFIG_KEY = '__moduleConfig';
const COMPONENT_CONFIG_KEY = '__componentConfig';

interface ModuleFileConfig {
    components?: (string | { class: any; scope?: string })[];
    dependencies?: string[];
    enabled?: boolean;
    version?: string;
    description?: string;
}

export async function createTestModuleFile(
    dir: string,
    name: string,
    config: Partial<ModuleFileConfig> = {}
): Promise<string> {
    const filePath = path.join(dir, `${name}.module.ts`);
    const componentsArg = JSON.stringify(config.components || []);

    // Создаём файл с factory function которая вернёт instance со static property
    // Factory функция проверяется isMetadata() и возвращает класс с установленным config
    const content = `// @ts-check
function ${name}ModuleFactory() {
  const moduleClass = class ${name}Module {};
  Object.defineProperty(moduleClass, MODULE_CONFIG_KEY, {
    value: {
      name: '${name}',
      components: ${componentsArg},
      dependencies: ${JSON.stringify(config.dependencies || [])},
      enabled: ${config.enabled ?? true},
      version: '${config.version || '1.0.0'}',
      description: config.description,
    },
    enumerable: false,
    writable: false,
    configurable: false,
  });
  return moduleClass;
}

export const ${name}Module = ${name}ModuleFactory();

// Экспортируем static property отдельно для проверки
export const ${name}ModuleConfig = Object.getOwnPropertyDescriptor(${name}Module, MODULE_CONFIG_KEY)?.value || {};

export default ${name}Module;`;

    await writeFile(filePath, content);
    return filePath;
}

interface IComponentConfig {
    scope?: string;
    dependencies?: string[];
    methods?: Record<string, string>;
}

export async function createTestComponentFile(
    dir: string,
    name: string,
    config: Partial<IComponentConfig> = {}
): Promise<string> {
    const filePath = path.join(dir, `${name}.component.ts`);
    const methodsCode = Object.entries(config.methods || {})
        .map(([methodName, methodBody]) => {
            return `${methodName}() { ${methodBody} }`;
        })
        .join('\n');

    // Создаём компонент с factory function тоже
    const content = `// @ts-check
function ${name}ComponentFactory() {
  const componentClass = class ${name}Component {};
  Object.defineProperty(componentClass, COMPONENT_CONFIG_KEY, {
    value: {
      name: '${name}',
      scope: '${config.scope || 'request'}',
      dependencies: ${JSON.stringify(config.dependencies || [])},
    },
    enumerable: false,
    writable: false,
    configurable: false,
  });

  ${methodsCode}

  return componentClass;
}

export const ${name}Component = ${name}ComponentFactory();

// Экспортируем static property отдельно для проверки
export const ${name}ComponentConfig = Object.getOwnPropertyDescriptor(${name}Component, COMPONENT_CONFIG_KEY)?.value || {};

export default ${name}Component;`;

    await writeFile(filePath, content);
    return filePath;
}
