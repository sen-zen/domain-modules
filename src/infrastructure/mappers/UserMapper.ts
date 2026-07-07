import { User as PrismaUser } from '@tastehub/prisma';
import { User } from '../../domain/entities/user/User';
import { UserId, Email, Password, } from '../../domain/value-objects';

/**
 * Маппер для преобразования между доменной моделью User и Prisma моделью
 * 
 * 🎯 Задача:
 * - Преобразование Prisma → Domain (при чтении из БД)
 * - Преобразование Domain → Prisma (при сохранении в БД)
 * 
 * 🔒 Безопасность:
 * - Все преобразования типобезопасны
 * - Не теряем данные при конвертации
 */
export class UserMapper {
    static toDomain(prisma: PrismaUser): User {
        if (!prisma.email) {
            throw new Error('User email is required');
        }
        return User.reconstitute({
            id: prisma.id,
            email: prisma.email,
            username: prisma.username || '',
            passwordHash: prisma.passwordHash || '',
            avatar: prisma.avatar,
            profilePictureUrl: prisma.profilePictureUrl,
            bio: prisma.bio,
            languageCode: prisma.languageCode,
            countryCode: prisma.countryCode,
            subscriptionStatus: prisma.subscriptionStatus,
            verificationToken: prisma.verificationToken,
            verificationTokenExpiresAt: prisma.verificationTokenExpiresAt,
            roleId: prisma.roleId,
            createdAt: prisma.createdAt,
            updatedAt: prisma.updatedAt,
        });
    }

    static toPrisma(user: User): PrismaUser {
        const data = user.toPrimitives();
        if (!data.email) {
            throw new Error('User email is required');
        }

        return {
            id: data.id,
            email: data.email,
            username: data.username,
            passwordHash: data.passwordHash || '',
            avatar: data.avatar || null,
            profilePictureUrl: data.profilePictureUrl || null,
            bio: data.bio || null,
            languageCode: data.languageCode || 'ru',
            countryCode: data.countryCode || null,
            subscriptionStatus: data.subscriptionStatus || false,
            verificationToken: data.verificationToken || null,
            verificationTokenExpiresAt: data.verificationTokenExpiresAt || null,
            roleId: data.roleId || null,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt || new Date(),
            // Связи (не маппим, они будут заполняться отдельно)
            // refreshTokens: [],
            // recipesAuthored: [],
            // commentsWritten: [],
            // likesGiven: [],
            // userPermissions: [],
        } as PrismaUser;
    }

    /**
     * Преобразование из Prisma в DTO (для API)
     * Используется при: возврате данных клиенту
     */
    static toDto(prisma: PrismaUser): {
        id: string;
        email: string;
        username: string;
        avatar: string | null;
        profilePictureUrl: string | null;
        bio: string | null;
        languageCode: string;
        countryCode: string | null;
        subscriptionStatus: boolean;
        roleId: string | null;
        createdAt: Date;
        updatedAt: Date;
    } {
        return {
            id: prisma.id,
            email: prisma.email,
            username: prisma.username || '',
            avatar: prisma.avatar,
            profilePictureUrl: prisma.profilePictureUrl,
            bio: prisma.bio,
            languageCode: prisma.languageCode,
            countryCode: prisma.countryCode,
            subscriptionStatus: prisma.subscriptionStatus,
            roleId: prisma.roleId,
            createdAt: prisma.createdAt,
            updatedAt: prisma.updatedAt,
        };
    }

    /**
     * Преобразование из Prisma в публичный DTO (без чувствительных данных)
     * Используется при: публичных API запросах
     */
    static toPublicDto(prisma: PrismaUser): {
        id: string;
        username: string;
        avatar: string | null;
        bio: string | null;
        languageCode: string;
        countryCode: string | null;
        subscriptionStatus: boolean;
        createdAt: Date;
    } {
        return {
            id: prisma.id,
            username: prisma.username || '',
            avatar: prisma.avatar,
            bio: prisma.bio,
            languageCode: prisma.languageCode,
            countryCode: prisma.countryCode,
            subscriptionStatus: prisma.subscriptionStatus,
            createdAt: prisma.createdAt,
        };
    }

    /**
     * Преобразование списка Prisma моделей в Доменные
     */
    static toDomainList(prismaUsers: PrismaUser[]): User[] {
        return prismaUsers.map(user => this.toDomain(user));
    }

    /**
     * Преобразование списка Prisma моделей в DTO
     */
    static toDtoList(prismaUsers: PrismaUser[]): ReturnType<typeof this.toDto>[] {
        return prismaUsers.map(user => this.toDto(user));
    }

    /**
     * Преобразование списка Prisma моделей в публичные DTO
     */
    static toPublicDtoList(prismaUsers: PrismaUser[]): ReturnType<typeof this.toPublicDto>[] {
        return prismaUsers.map(user => this.toPublicDto(user));
    }

    /**
     * Обновление Prisma модели из доменной
     * Используется при: частичных обновлениях
     */
    static toPrismaUpdate(user: User): Partial<PrismaUser> {
        const data = user.toPrimitives();

        return {
            email: data.email,
            username: data.username,
            passwordHash: data.passwordHash || undefined,
            avatar: data.avatar,
            profilePictureUrl: data.profilePictureUrl,
            bio: data.bio,
            languageCode: data.languageCode,
            countryCode: data.countryCode,
            subscriptionStatus: data.subscriptionStatus,
            verificationToken: data.verificationToken,
            verificationTokenExpiresAt: data.verificationTokenExpiresAt,
            roleId: data.roleId,
            updatedAt: new Date(),
        };
    }

    /**
     * Создание Prisma модели для новых пользователей
     */
    static toPrismaCreate(user: User): Omit<PrismaUser, 'refreshTokens' | 'recipesAuthored' | 'commentsWritten' | 'likesGiven' | 'userPermissions'> {
        const data = user.toPrimitives();

        return {
            id: data.id,
            email: data.email,
            username: data.username || null,
            passwordHash: data.passwordHash || '',
            avatar: data.avatar || null,
            profilePictureUrl: data.profilePictureUrl || null,
            bio: data.bio || null,
            languageCode: data.languageCode || 'ru',
            countryCode: data.countryCode || null,
            subscriptionStatus: data.subscriptionStatus || false,
            verificationToken: data.verificationToken || null,
            verificationTokenExpiresAt: data.verificationTokenExpiresAt || null,
            roleId: data.roleId || null,
            createdAt: data.createdAt || new Date(),
            updatedAt: data.updatedAt || new Date(),
        };
    }
}
