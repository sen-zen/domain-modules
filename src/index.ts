import { ModuleContainer, ContainerOptions } from './di';

export async function initializeCore(options: ContainerOptions) {
    const moduleContainer = new ModuleContainer(options);

    moduleContainer.registerAllModules();

    return {
        moduleContainer
    };
}

export * from './modules/core';
export * from './modules/auth';
export * from './modules/user';
export * from './di';

