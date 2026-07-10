import type { PrismaClient } from '@tastehub/prisma';
import type { IRefreshTokenRepository } from '../../domain/repositories/IRefreshTokenRepository';
import { UserId } from '../../domain/value-objects/UserId';
import { RefreshToken } from '../../domain/entities/user/RefreshToken';
import { RefreshTokenMapper } from '../mappers/RefreshTokenMapper';

/**
 * Реализация репозитория через Prisma для управления Refresh токенами
 * 
 * ✅ DDD Rules:
 * - Использует Prisma ONLY в Infrastructure layer
 * - Реализует IRefreshTokenRepository из Domain
 * - Маппит RefreshToken domain entity → Prisma модель
 */
export class PrismaRefreshTokenRepository implements IRefreshTokenRepository {
    constructor(private readonly prisma: PrismaClient) { }

    async findById(id: string): Promise<ReturnType<typeof RefreshTokenMapper.toDomain> | null> {
        const refreshToken = await this.prisma.refreshToken.findUnique({
            where: { id }
        });
        return refreshToken ? RefreshTokenMapper.toDomain(refreshToken) : null;
    }

    async findByToken(token: string): Promise<ReturnType<typeof RefreshTokenMapper.toDomain> | null> {
        const refreshToken = await this.prisma.refreshToken.findFirst({
            where: { token }
        });
        return refreshToken ? RefreshTokenMapper.toDomain(refreshToken) : null;
    }

    async findByUserId(userId: UserId): Promise<ReturnType<typeof RefreshTokenMapper.toDomain>[]> {
        const tokens = await this.prisma.refreshToken.findMany({
            where: { userId: userId.value },
            orderBy: { createdAt: 'desc' }
        });
        return tokens.map(RefreshTokenMapper.toDomain);
    }

    async findByFamilyId(familyId: string): Promise<ReturnType<typeof RefreshTokenMapper.toDomain>[]> {
        const tokens = await this.prisma.refreshToken.findMany({
            where: { familyId },
            orderBy: { createdAt: 'desc' }
        });
        return tokens.map(RefreshTokenMapper.toDomain);
    }

    async save(refreshToken: RefreshToken): Promise<ReturnType<typeof RefreshTokenMapper.toDomain>> {
        const data = RefreshTokenMapper.toPrismaCreate(refreshToken);
        const token = await this.prisma.refreshToken.create({ data });
        return RefreshTokenMapper.toDomain(token);
    }

    async update(refreshToken: RefreshToken): Promise<void> {
        const data = RefreshTokenMapper.toPrismaUpdate(refreshToken);
        await this.prisma.refreshToken.update({
            where: { id: refreshToken.id },
            data
        });
    }

    async delete(id: string): Promise<void> {
        await this.prisma.refreshToken.delete({
            where: { id }
        });
    }

    async revoke(id: string): Promise<void> {
        await this.prisma.refreshToken.update({
            where: { id },
            data: { revokedAt: new Date() }
        });
    }

    async revokeAllByUserId(userId: UserId): Promise<void> {
        await this.prisma.refreshToken.updateMany({
            where: { userId: userId.value, revokedAt: null },
            data: { revokedAt: new Date() }
        });
    }

    async revokeAllByFamilyId(familyId: string): Promise<void> {
        await this.prisma.refreshToken.updateMany({
            where: { familyId, revokedAt: null },
            data: { revokedAt: new Date() }
        });
    }

    async rotateAndRevoke(oldTokenId: string, newToken: RefreshToken): Promise<void> {
        const now = new Date();
        await this.prisma.$transaction(async (prisma) => {
            await prisma.refreshToken.update({
                where: { id: oldTokenId },
                data: {
                    revokedAt: now,
                    replacedBy: newToken.id
                }
            });

            const data = RefreshTokenMapper.toPrismaCreate(newToken);
            await prisma.refreshToken.create({ data });
        });
    }

    async revokeAllExcept(userId: UserId, tokenId: string): Promise<void> {
        await this.prisma.refreshToken.updateMany({
            where: {
                userId: userId.value,
                id: { not: tokenId },
                revokedAt: null
            },
            data: { revokedAt: new Date() }
        });
    }


    async updateLastUsed(id: string): Promise<void> {
        await this.prisma.refreshToken.update({
            where: { id },
            data: { lastUsedAt: new Date() }
        });
    }
}
