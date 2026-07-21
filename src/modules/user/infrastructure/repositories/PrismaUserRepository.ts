import { PrismaRepository } from '@core/infrastructure/repositories/PrismaRepository';
import { UserMapper } from '@user/infrastructure/mappers/UserMapper';
import { UserId } from '@user/domain/value-objects/UserId';
import { Password } from '@core/domain/value-objects/Password';
import { Email } from '@core/domain/value-objects/Email';
import type { UserAuthData } from '@user/domain/repositories/IUserRepository.types';
import type { IUserRepository } from '@user/domain/repositories/IUserRepository';


export class PrismaUserRepository extends PrismaRepository implements IUserRepository {

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
