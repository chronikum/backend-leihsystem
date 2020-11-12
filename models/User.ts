import { UserRoles } from '../enums/UserRoles';

/**
 * Represents user
 */
export interface User {
    userId?: string,
    username: string,
    firstname: string,
    surname: string,
    email?: string,
    password?: string,
    lastLogin?: number,
    session?: string,
    role: UserRoles,
}
