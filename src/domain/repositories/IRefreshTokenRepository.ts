import { RefreshToken } from '../entities/user/RefreshToken';
import { UserId } from '../value-objects/UserId';

export interface IRefreshTokenRepository {
    // /**
    //  * Найти refresh token по значению токена
    //  */
    // findByToken(token: string): Promise<RefreshToken | null>;

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

    // /**
    //  * Удалить refresh token
    //  */
    // delete(id: string): Promise<void>;

    // /**
    //  * Отозвать refresh token (revoke)
    //  */
    // revoke(id: string): Promise<void>;

    /**
     * Отозвать все refresh токены пользователя
     */
    revokeAllByUserId(userId: UserId): Promise<void>;

    // /**
    //  * Отозвать все refresh токены по familyId
    //  */
    // revokeAllByFamilyId(familyId: string): Promise<void>;

    // /**
    //  * Проверить, существует ли активный refresh token
    //  */
    // existsActive(token: string): Promise<boolean>;

    // /**
    //  * Проверить, существует ли активный refresh token для пользователя
    //  */
    // existsActiveByUserId(userId: UserId): Promise<boolean>;

    // /**
    //  * Обновить время последнего использования токена
    //  */
    // updateLastUsed(id: string): Promise<void>;

    // /**
    //  * Получить все просроченные токены (для очистки)
    //  */
    // findExpired(): Promise<RefreshToken[]>;

    // /**
    //  * Удалить все просроченные токены
    //  */
    // deleteExpired(): Promise<number>;

    // /**
    //  * Получить статистику по токенам пользователя
    //  */
    // getStatsByUserId(userId: UserId): Promise<{
    //     total: number;
    //     active: number;
    //     revoked: number;
    //     expired: number;
    // }>;

    // /**
    //  * Получить количество активных токенов пользователя
    //  */
    // countActiveByUserId(userId: UserId): Promise<number>;

    // /**
    //  * Отозвать все токены, кроме указанного (оставить только одну сессию)
    //  */
    // revokeAllExcept(userId: UserId, tokenId: string): Promise<void>;

    // /**
    //  * Найти токен по замене (replacedBy)
    //  */
    // findByReplacedBy(replacedBy: string): Promise<RefreshToken | null>;

    // /**
    //  * Проверить, не превышен ли лимит активных сессий
    //  */
    // hasExceededSessionLimit(userId: UserId, limit: number): Promise<boolean>;
}