import type { PrismaClient } from '@tastehub/prisma';

export abstract class PrismaRepository {
    protected readonly prisma: PrismaClient;

    constructor(prisma?: PrismaClient) {
        if (prisma) {
            this.prisma = prisma;
            // } 
            // else if (moduleContainer.has('prisma')) {
            //     this.prisma = container.get('prisma') as PrismaClient;
        } else {
            throw new Error(
                'PrismaClient is required for server-side operations. ' +
                'Make sure container is initialized or pass prisma instance.'
            );
        }
    }
}
