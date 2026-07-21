import { ModuleScanner, ModuleContainer, ContainerOptions } from './di';

export async function initializeCore(options: ContainerOptions) {
    const moduleContainer = new ModuleContainer(options);
    const scanner = new ModuleScanner(moduleContainer);

    await scanner.scan('./modules');

    console.log('[Core] Initialized with', moduleContainer.getAllModules().size, 'modules');

    return {
        moduleContainer
    };
}

export * from './modules/core';
export * from './modules/auth';
export * from './modules/user';
export * from './di';

