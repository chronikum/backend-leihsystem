import { UserRoles } from '../enums/UserRoles';
import { Group } from './Group';

/**
 * Represents user
 */
export interface User {
    userId?: string,
    username: string,
    firstname: string,
    surname: string,
    phone?: string,
    matrikelnumber?: string,
    email?: string,
    password?: string,
    lastLogin?: number,
    session?: string,
    role: UserRoles,
    groupId: number[],
    groupRoles?: UserRoles[], // Is being supplied by backend - represents roles which the user has been assigned through group management
    isLDAP?: boolean,
}
