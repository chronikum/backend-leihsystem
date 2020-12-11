/**
 * Public user
 */

import { UserRoles } from '../enums/UserRoles';

export interface PublicUser {
    userId?: string,
    username: string,
    firstname: string,
    surname: string,
    email?: string,
    lastLogin?: number,
    session?: string,
    role: UserRoles,
}
