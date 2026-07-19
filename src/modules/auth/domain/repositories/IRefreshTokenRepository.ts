import { RefreshToken } from '@auth/domain/entities/RefreshToken';
import { UserId } from '@user/domain/value-objects';

export interface IRefreshTokenRepository {
    /**
     * Найти refresh token по значению токена
     */
    findByToken(token: string): Promise<RefreshToken | null>;

    // /**
    //  * Найти все активные refresh токены пользователя
    //  */
    // findActiveByUserId(userId: UserId): Promise<RefreshToken[]>;

    // /**
    //  * Найти refresh токен по familyId (группа токенов для одного устройства)
    //  */
    // findByFamilyId(familyId: string): Promise<RefreshToken[]>;

    /**
     * Сохранить новый refresh token
     */
    save(token: RefreshToken): Promise<RefreshToken | null>;

    // /**
    //  * Обновить существующий refresh token
    //  */
    // update(token: RefreshToken): Promise<void>;

    /**
     * Обновление времени последнего использования
     */
    updateLastUsed(id: string): Promise<void>;

    // /**
    //  * Удалить refresh token
    //  */
    // delete(id: string): Promise<void>;

    /**
     * Отозвать refresh token (revoke)
     */
    revoke(id: string): Promise<void>;

    /**
     * Отозвать все refresh токены пользователя
     */
    revokeAllByUserId(userId: UserId): Promise<void>;

    /**
     * Отозвать все refresh токены по familyId
     */
    revokeAllByFamilyId(familyId: string): Promise<void>;

    /**
     * Отозвать все токены, кроме указанного (оставить только одну сессию)
     */
    revokeAllExcept(userId: UserId, tokenId: string): Promise<void>;

    /**
     * Ротация
     */
    rotateAndRevoke(oldTokenId: string, newToken: RefreshToken): Promise<void>;
}