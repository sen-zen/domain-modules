import type { PrismaClient } from '@tastehub/prisma';
import type { IRefreshTokenRepository } from '../../domain/repositories/IRefreshTokenRepository';
import { UserId } from '../../domain/value-objects';
import { RefreshToken } from '../../domain/entities/user/RefreshToken';
import { RefreshTokenMapper } from '../mappers/RefreshTokenMapper';


export class PrismaRefreshTokenRepository implements IRefreshTokenRepository {
    constructor(private readonly prisma: PrismaClient) { }

    async save(refreshToken: RefreshToken): Promise<ReturnType<typeof RefreshTokenMapper.toDomain> | null> {
        const data = RefreshTokenMapper.toPrismaCreate(refreshToken);
        const token = await this.prisma.refreshToken.create({ data });
        return token ? RefreshTokenMapper.toDomain(token) : null;
    }

    async revokeAllByUserId(userId: UserId): Promise<void> {
        await this.prisma.refreshToken.updateMany({
            where: { userId: userId.value, revokedAt: null },
            data: { revokedAt: new Date() },
        });
    }
}