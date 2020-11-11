/**
 * Represents user
 */
export interface User {
    userId: string,
    name: string,
    surname: string,
    email?: string,
    password?: string,
    lastLogin?: number,
    session?: string,
}
