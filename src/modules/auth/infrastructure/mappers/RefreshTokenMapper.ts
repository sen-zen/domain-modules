import { RefreshToken } from '../../domain/entities/RefreshToken';
import { RefreshToken as PrismaRefreshToken } from '@tastehub/prisma'

/**
 * Маппер для преобразования между доменной моделью RefreshToken и Prisma моделью
 * 
 * 🎯 Задача:
 * - Преобразование Prisma → Domain (при чтении из БД)
 * - Преобразование Domain → Prisma (при сохранении в БД)
 * 
 * 🔒 Безопасность:
 * - Все преобразования типобезопасны
 * - Не теряем данные при конвертации
 */
export class RefreshTokenMapper {
    static toDomain(prisma: PrismaRefreshToken) {
        if (!prisma.token) {
            throw new Error('Refresh token value is required');
        }
        if (!prisma.userId) {
            throw new Error('User ID is required');
        }
        return RefreshToken.reconstitute({
            id: prisma.id,
            token: prisma.token,
            familyId: prisma.familyId,
            userId: prisma.userId,
            expiresAt: prisma.expiresAt,
            revokedAt: prisma.revokedAt,
            replacedBy: prisma.replacedBy,
            userAgent: prisma.userAgent,
            ipAddress: prisma.ipAddress,
            deviceName: prisma.deviceName,
            createdAt: prisma.createdAt,
            lastUsedAt: prisma.lastUsedAt,
        });
    }

    static toPrisma(token: RefreshToken) {
        const data = token.toPrimitives();
        if (!data.token) {
            throw new Error('Refresh token value is required');
        }
        if (!data.userId) {
            throw new Error('User ID is required');
        }
        return {
            id: data.id,
            token: data.token,
            familyId: data.familyId,
            userId: data.userId,
            expiresAt: data.expiresAt,
            revokedAt: data.revokedAt,
            replacedBy: data.replacedBy,
            userAgent: data.userAgent,
            ipAddress: data.ipAddress,
            deviceName: data.deviceName,
            createdAt: data.createdAt,
            lastUsedAt: data.lastUsedAt,
        } as PrismaRefreshToken;
    }

    static toDto(prisma: PrismaRefreshToken): {
        id: string;
        familyId: string;
        userId: string;
        expiresAt: Date;
        isRevoked: boolean;
        isExpired: boolean;
        deviceName: string | null;
        lastUsedAt: Date;
        createdAt: Date;
    } {
        const now = new Date();
        return {
            id: prisma.id,
            familyId: prisma.familyId,
            userId: prisma.userId,
            expiresAt: prisma.expiresAt,
            isRevoked: prisma.revokedAt !== null,
            isExpired: prisma.expiresAt < now,
            deviceName: prisma.deviceName,
            lastUsedAt: prisma.lastUsedAt,
            createdAt: prisma.createdAt,
        };
    }

    static toPublicDto(prisma: PrismaRefreshToken): {
        id: string;
        deviceName: string | null;
        lastUsedAt: Date;
        isActive: boolean;
    } {
        const now = new Date();
        const isActive = prisma.revokedAt === null && prisma.expiresAt > now;
        return {
            id: prisma.id,
            deviceName: prisma.deviceName,
            lastUsedAt: prisma.lastUsedAt,
            isActive,
        };
    }

    static toDomainList(prismaTokens: PrismaRefreshToken[]): RefreshToken[] {
        return prismaTokens.map(token => this.toDomain(token));
    }

    static toDtoList(prismaTokens: PrismaRefreshToken[]): ReturnType<typeof this.toDto>[] {
        return prismaTokens.map(token => this.toDto(token));
    }

    static toPublicDtoList(prismaTokens: PrismaRefreshToken[]): ReturnType<typeof this.toPublicDto>[] {
        return prismaTokens.map(token => this.toPublicDto(token));
    }

    static toPrismaUpdate(token: RefreshToken): Partial<PrismaRefreshToken> {
        const data = token.toPrimitives();
        return {
            token: data.token,
            familyId: data.familyId,
            userId: data.userId,
            expiresAt: data.expiresAt,
            revokedAt: data.revokedAt,
            replacedBy: data.replacedBy,
            userAgent: data.userAgent,
            ipAddress: data.ipAddress,
            deviceName: data.deviceName,
            lastUsedAt: data.lastUsedAt,
        };
    }

    static toPrismaCreate(token: RefreshToken): Omit<PrismaRefreshToken, 'id' | 'createdAt' | 'lastUsedAt'> {
        const data = token.toPrimitives();
        if (!data.token) {
            throw new Error('Refresh token value is required');
        }
        if (!data.userId) {
            throw new Error('User ID is required');
        }
        return {
            token: data.token,
            familyId: data.familyId,
            userId: data.userId,
            expiresAt: data.expiresAt,
            revokedAt: data.revokedAt,
            replacedBy: data.replacedBy,
            userAgent: data.userAgent,
            ipAddress: data.ipAddress,
            deviceName: data.deviceName,
        }
    }

    static toPrismaLastUsed(id: string, lastUsedAt: Date): Partial<PrismaRefreshToken> {
        return {
            id,
            lastUsedAt,
        };
    }

    static toPrismaRevoke(id: string, revokedAt: Date): Partial<PrismaRefreshToken> {
        return {
            id,
            revokedAt,
        };
    }

    static toPrismaRotate(
        oldTokenId: string,
        newTokenId: string,
        revokedAt: Date
    ): Partial<PrismaRefreshToken> {
        return {
            id: oldTokenId,
            revokedAt,
            replacedBy: newTokenId,
        };
    }

    static toStats(data: {
        total: number;
        active: number;
        revoked: number;
        expired: number;
    }): {
        total: number;
        active: number;
        revoked: number;
        expired: number;
    } {
        return {
            total: data.total,
            active: data.active,
            revoked: data.revoked,
            expired: data.expired,
        };
    }
}