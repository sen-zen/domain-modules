import 'reflect-metadata';

import { ModuleScanner, ModuleContainer } from './di';

export async function initializeCore() {
    const moduleContainer = new ModuleContainer();
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

