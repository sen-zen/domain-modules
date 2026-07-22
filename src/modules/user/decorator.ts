import { Component, type ComponentConfig } from "@/decorators/Component";
import { USER_MODULE_NAME } from './user.module';

export function UserComponent(config: Omit<Partial<ComponentConfig>, 'module'>) {
    return Component({
        ...config,
        module: USER_MODULE_NAME
    })
}
