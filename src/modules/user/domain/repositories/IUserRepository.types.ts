import { UserId } from "../value-objects";
import { Email, Password } from "../../../core/domain/value-objects";

export interface UserAuthData {
    id: UserId;
    email: Email;
    name: string | null;
    passwordHash: Password
    isVerified: boolean;
    isBlocked: boolean;
}
