import { UserMapper } from '../mappers/UserMapper';
import { UserId } from '../../domain/value-objects/UserId';
import { Password } from '../../domain/value-objects/Password';
import { Email } from '../../domain/value-objects/Email';
import type { PrismaClient } from '@tastehub/prisma';
import type { IUserRepository } from '../../domain/repositories/IUserRepository';
import { UserAuthData } from '../../domain/repositories/IUserRepository.types';


export class PrismaUserRepository implements IUserRepository {
    constructor(private readonly prisma: PrismaClient) { }

    async findById(id: UserId): Promise<ReturnType<typeof UserMapper.toDomain> | null> {
        const user = await this.prisma.user.findUnique({
            where: { id: id.value },
        });
        return user ? UserMapper.toDomain(user) : null;
    }

    async findByEmail(email: Email): Promise<ReturnType<typeof UserMapper.toDomain> | null> {
        const user = await this.prisma.user.findFirst({
            where: { email: email.value }
        });
        return user ? UserMapper.toDomain(user) : null;
    }

    async delete(id: string): Promise<void> {
        await this.prisma.user.delete({ where: { id } });
    }

    async findAuthData(email: string): Promise<UserAuthData | null> {
        const user = await this.prisma.user.findFirst({
            where: { email }
        });

        if (!user) {
            return null;
        }

        return {
            id: UserId.create(user.id),
            email: Email.create(user.email),
            name: user.username,
            passwordHash: Password.fromHash(user.passwordHash),
            isBlocked: false,
            isVerified: user.verificationToken === null
        }
    }
}
