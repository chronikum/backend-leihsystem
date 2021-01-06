import { UserRoles } from '../enums/UserRoles';

/**
 * User Group
 */
export interface Group {
    groupId?: number;
    displayName: string;
    description: string;
    role: UserRoles[];
}
