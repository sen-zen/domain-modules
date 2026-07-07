import { Email, Password, UserId } from "../value-objects";

export interface UserAuthData {
    id: UserId;
    email: Email;
    name: string | null;
    passwordHash: Password
    isVerified: boolean;
    isBlocked: boolean;
}
