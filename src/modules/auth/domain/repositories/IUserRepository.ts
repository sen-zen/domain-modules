import { User } from '../../../user/domain/entities';
import { UserId } from '../../../user/domain/value-objects/UserId';
import { Email } from '../../../core/domain/value-objects/Email';

import type {
    UserAuthData
} from './IUserRepository.types';

export interface IUserRepository {
    // ============ БАЗОВЫЕ CRUD ============

    findById(id: UserId): Promise<User | null>;

    findByEmail(email: Email): Promise<User | null>;

    delete(id: string): Promise<void>;

    // ============ СПЕЦИАЛИЗИРОВАННЫЕ МЕТОДЫ ============

    findAuthData(email: string): Promise<UserAuthData | null>;
}
